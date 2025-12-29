<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";
import { siteConfig } from "@/config";

let showPanel = false;

// 记录各镜像的延迟（毫秒），key 为镜像的 URL
let latencies: Record<string, number | null> = {};
let testing = false;

function togglePanel() {
	showPanel = !showPanel;
	if (showPanel) {
		// 面板展开时触发一次测速
		testAllMirrors();
	}
}

function hidePanel() {
	showPanel = false;
}

function switchMirror(url: string) {
	window.location.href = url + window.location.pathname;
}

// 使用图片加载时间进行跨域测速（不读取内容，仅测网络耗时）
function testLatency(url: string): Promise<number> {
	return new Promise((resolve) => {
		const start = performance.now();
		const img = new Image();
		// 选择一个稳定存在的资源路径，并加入随机参数避免缓存
		img.src = `${url}/favicon/rt3box-favicon.jpg?ping=${Date.now()}${Math.random()}`;
		const done = () => resolve(Math.round(performance.now() - start));
		img.onload = done;
		img.onerror = done; // 即便加载失败也返回耗时，用于对比网络延迟
	});
}

async function testAllMirrors() {
	if (!siteConfig.mirrors?.sites?.length) return;
	testing = true;
	latencies = {};
	await Promise.all(
		siteConfig.mirrors.sites.map(async (site) => {
			try {
				const ms = await testLatency(site.url);
				latencies[site.url] = ms;
			} catch (e) {
				latencies[site.url] = null;
			}
		}),
	);
	testing = false;
}

onMount(() => {
	// 可选：页面初次加载时也进行一次后台测速
	// 避免影响首屏交互，不展开面板也可预热数据
	testAllMirrors();
});
</script>

{#if siteConfig.mirrors?.enable && siteConfig.mirrors.sites.length > 0}
<div class="relative">
    <button 
        aria-label="镜像站选择" 
        class="btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90" 
        on:click={togglePanel}
    >
        <Icon icon="material-symbols:language" class="text-[1.25rem]" />
    </button>
    
    {#if showPanel}
    <div 
        id="mirror-panel" 
        class="float-panel absolute transition-all w-80 right-0 top-12 px-4 py-4 z-50"
        on:mouseleave={hidePanel}
    >
        <div class="flex flex-row gap-2 mb-3 items-center justify-between">
            <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3
                before:w-1 before:h-4 before:rounded-md before:bg-[var(--primary)]
                before:absolute before:-left-3 before:top-[0.33rem]"
            >
                镜像站选择
            </div>
            <button 
                class="btn-plain rounded-md h-8 w-8 flex items-center justify-center active:scale-95"
                aria-label="刷新测速"
                title="刷新测速"
                on:click={testAllMirrors}
            >
                {#if testing}
                <Icon icon="material-symbols:progress-activity" class="text-[1rem] opacity-80" />
                {:else}
                <Icon icon="material-symbols:refresh" class="text-[1rem]" />
                {/if}
            </button>
        </div>
        <div class="flex flex-col gap-1">
            {#each siteConfig.mirrors.sites as site}
            <button 
                class="flex transition items-center justify-between w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95"
                on:click={() => switchMirror(site.url)}
            >
                <div class="flex items-center min-w-0">
                    <Icon icon="material-symbols:public" class="text-[1.25rem] mr-3 flex-shrink-0" />
                    <span class="text-left whitespace-normal break-words">{site.name}</span>
                </div>
                <div class="ml-3 text-xs opacity-80 flex items-center gap-1">
                    {#if latencies[site.url] === null}
                        —
                    {:else if latencies[site.url]}
                        {#if latencies[site.url] < 200}
                        <span class="text-green-600 dark:text-green-400">{latencies[site.url]} ms</span>
                        {:else if latencies[site.url] < 500}
                        <span class="text-yellow-600 dark:text-yellow-400">{latencies[site.url]} ms</span>
                        {:else}
                        <span class="text-red-600 dark:text-red-400">{latencies[site.url]} ms</span>
                        {/if}
                    {:else}
                        <span>测试中…</span>
                    {/if}
                </div>
            </button>
            {/each}
        </div>
    </div>
    {/if}
</div>
{/if}

<style>
.float-panel {
    background: var(--card-bg);
    border: 1px solid var(--line-divider);
    border-radius: 0.75rem;
    box-shadow: var(--shadow-l2);
    backdrop-filter: blur(20px);
}
</style>
