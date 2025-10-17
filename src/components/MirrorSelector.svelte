<script lang="ts">
import { siteConfig } from "@/config";
import Icon from "@iconify/svelte";

let showPanel = false;

function togglePanel() {
    showPanel = !showPanel;
}

function hidePanel() {
    showPanel = false;
}

function switchMirror(url: string) {
    window.location.href = url + window.location.pathname;
}
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
        class="float-panel absolute transition-all w-52 right-0 top-12 px-4 py-4 z-50"
        on:mouseleave={hidePanel}
    >
        <div class="flex flex-row gap-2 mb-3 items-center justify-between">
            <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3
                before:w-1 before:h-4 before:rounded-md before:bg-[var(--primary)]
                before:absolute before:-left-3 before:top-[0.33rem]"
            >
                镜像站选择
            </div>
        </div>
        <div class="flex flex-col gap-1">
            {#each siteConfig.mirrors.sites as site}
            <button 
                class="flex transition whitespace-nowrap items-center !justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95"
                on:click={() => switchMirror(site.url)}
            >
                <Icon icon="material-symbols:public" class="text-[1.25rem] mr-3 flex-shrink-0" />
                <span class="text-left">{site.name}</span>
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