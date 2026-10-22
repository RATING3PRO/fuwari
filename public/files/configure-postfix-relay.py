#!/usr/bin/env python3
"""Configure a Debian/systemd Postfix SMTP relay. Run interactively as root."""
import datetime
import getpass
import os
import pathlib
import re
import shutil
import smtplib
import ssl
import subprocess
import tempfile
from email.message import EmailMessage

BASE = pathlib.Path('/etc/postfix')
FILES = ('main.cf', 'relay_auth_generic', 'relay_auth_generic.db', 'relay_sender_generic')

def run(*args):
    subprocess.run(args, check=True)

def ask(label, default=''):
    value = input(label + (f' [{default}]' if default else '') + ': ').strip()
    return value or default

def yes(label, default=False):
    return ask(label + ' (yes/no)', 'yes' if default else 'no').lower() in ('y', 'yes')

def safe(value):
    if any(c in value for c in '\r\n\x00'):
        raise ValueError('Input contains prohibited control characters.')
    return value

def address(value):
    if not re.fullmatch(r'[A-Za-z0-9.!#$%&\x27*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+', value):
        raise ValueError('Enter a plain email address, without a display name.')
    return value

def write_private(path, text):
    fd, name = tempfile.mkstemp(dir=path.parent, prefix='.relay-')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(text)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)

def main():
    if os.geteuid() != 0:
        raise SystemExit('Run as root: sudo python3 configure-postfix-relay.py')
    if not os.isatty(0):
        raise SystemExit('Run in an interactive terminal.')
    os.umask(0o077)
    for cmd in ('postconf', 'postmap', 'postfix', 'systemctl'):
        if not shutil.which(cmd):
            raise SystemExit(f'Missing command: {cmd}. Install Postfix first.')
    if not (BASE/'main.cf').is_file():
        raise SystemExit('/etc/postfix/main.cf is missing.')
    maps = subprocess.check_output(['postconf', '-m'], text=True).split()
    if not {'hash', 'regexp'} <= set(maps):
        raise SystemExit('This script requires Postfix hash and regexp map support.')

    host = ask('SMTP hostname or IPv4 address')
    if not re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?', host):
        raise SystemExit('Use a hostname or IPv4 address, without protocol or port.')
    mode = ask('Encryption: starttls or tls (implicit TLS)', 'starttls').lower()
    if mode not in ('tls', 'starttls'):
        raise SystemExit('Choose tls or starttls; plaintext relay is not supported.')
    port = int(ask('SMTP port', '465' if mode == 'tls' else '587'))
    if not 1 <= port <= 65535:
        raise SystemExit('Invalid port.')
    auth = yes('Use username/password authentication', True)
    username = safe(ask('SMTP username')) if auth else ''
    password = safe(getpass.getpass('SMTP password / app password: ')) if auth else ''
    if auth and (not username or not password or ':' in username or any(c.isspace() for c in username)):
        raise SystemExit('Username/password required; username cannot contain whitespace or a colon.')
    sender = address(safe(ask('Sender email address')))
    rewrite = yes('Rewrite ALL local envelope/header sender addresses to this address', False)
    ca = pathlib.Path(ask('CA bundle path', '/etc/ssl/certs/ca-certificates.crt'))
    if not ca.is_file() or any(c.isspace() for c in str(ca)):
        raise SystemExit('CA bundle must exist and its path must not contain whitespace.')

    context = ssl.create_default_context(cafile=str(ca))
    print('Checking TLS certificate and SMTP authentication; no email is sent yet...')
    if mode == 'tls':
        conn = smtplib.SMTP_SSL(host, port, timeout=20, context=context)
    else:
        conn = smtplib.SMTP(host, port, timeout=20)
    with conn:
        conn.ehlo()
        if mode == 'starttls':
            conn.starttls(context=context)
            conn.ehlo()
        if auth:
            conn.login(username, password)
    print('Connection check passed.')

    active = subprocess.run(['systemctl', 'is-active', '--quiet', 'postfix']).returncode == 0
    backup = pathlib.Path(tempfile.mkdtemp(prefix='postfix-relay-backup-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S') + '-', dir='/root'))
    existed = []
    for name in FILES:
        source = BASE/name
        if source.is_symlink():
            raise SystemExit(f'Refusing to replace symlink: {source}')
        if source.exists():
            shutil.copy2(source, backup/name)
            existed.append(name)
    (backup/'manifest.txt').write_text('\n'.join(existed)+'\n')
    relay = f'[{host}]:{port}'
    settings = {
        'relayhost': relay,
        'smtp_tls_wrappermode': 'yes' if mode == 'tls' else 'no',
        'smtp_tls_security_level': 'verify',
        'smtp_tls_verify_cert_match': 'nexthop',
        'smtp_tls_CAfile': str(ca),
        'smtp_tls_loglevel': '1',
        'smtp_sasl_auth_enable': 'yes' if auth else 'no',
        'smtp_sasl_password_maps': 'hash:/etc/postfix/relay_auth_generic' if auth else '',
        'smtp_sasl_security_options': 'noanonymous',
        'smtp_sasl_tls_security_options': 'noanonymous',
    }
    try:
        if auth:
            write_private(BASE/'relay_auth_generic', f'{relay} {username}:{password}\n')
            run('postmap', 'hash:/etc/postfix/relay_auth_generic')
            (BASE/'relay_auth_generic.db').chmod(0o600)
        else:
            for name in ('relay_auth_generic', 'relay_auth_generic.db'):
                (BASE/name).unlink(missing_ok=True)
        if rewrite:
            write_private(BASE/'relay_sender_generic', '/^.+$/ ' + sender + '\n')
            settings['sender_canonical_classes'] = 'envelope_sender, header_sender'
            settings['sender_canonical_maps'] = 'regexp:/etc/postfix/relay_sender_generic'
        # When rewrite is declined, existing sender-rewrite rules remain unchanged.
        for key, value in settings.items():
            run('postconf', '-e', key + ' = ' + value)
        run('postfix', 'check')
        run('systemctl', 'reload' if active else 'start', 'postfix')
    except Exception:
        for name in FILES:
            if name in existed:
                shutil.copy2(backup/name, BASE/name)
            else:
                (BASE/name).unlink(missing_ok=True)
        subprocess.run(['systemctl', 'reload' if active else 'stop', 'postfix'])
        print('Configuration failed; previous files restored. Backup:', backup)
        raise
    print('Postfix relay configured. Backup:', backup)
    if not rewrite:
        print('Sender rewrite rules were left unchanged; configure the From address in your application.')
    print('Inspect delivery with: postqueue -p; journalctl -u postfix; /var/log/mail.log if present.')

    if yes('Send a test email THROUGH local Postfix now', False):
        recipient = address(safe(ask('Test recipient')))
        message = EmailMessage()
        message['From'] = sender
        message['To'] = recipient
        message['Subject'] = 'Postfix SMTP relay test'
        message.set_content('This is a test email submitted through the local Postfix relay.')
        sendmail = shutil.which('sendmail') or '/usr/sbin/sendmail'
        subprocess.run([sendmail, '-i', '-f', sender, '--', recipient], input=message.as_bytes(), check=True)
        print('Test submitted to local Postfix. This is NOT confirmation of inbox delivery.')

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nInterrupted. If interrupted during configuration, inspect the backup and current settings.')
        raise SystemExit(130)
    except Exception as exc:
        # Avoid printing authentication responses or other potentially sensitive data.
        print('Operation failed:', type(exc).__name__, '(credentials are not printed).')
        raise SystemExit(1)
