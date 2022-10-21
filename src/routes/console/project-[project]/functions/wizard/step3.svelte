<script lang="ts">
    import { WizardStep } from '$lib/layout';
    import { Button } from '$lib/elements/forms';
    import { Empty } from '$lib/components';
    import { createFunction } from './store';
    import { EventModal } from '$lib/components';
    import { TableList, TableCellText, TableCell } from '$lib/elements/table';

    let showCreate = false;

    let eventSet = new Set<string>();

    function handleCreated(event: CustomEvent) {
        eventSet.add(event.detail);
        $createFunction.events = Array.from(eventSet);
    }
</script>

<WizardStep>
    <svelte:fragment slot="title">Events (optional)</svelte:fragment>
    <svelte:fragment slot="subtitle">
        Set the events that will trigger your function. Maximum 100 events allowed.
    </svelte:fragment>

    <span class="u-sep-block-end">EVENT</span>

    {#if $createFunction?.events?.length}
        <TableList>
            {#each $createFunction.events as event}
                <li class="table-row">
                    <TableCellText title="id">
                        {event}
                    </TableCellText>
                    <TableCell showOverflow title="options" width={40}>
                        <button
                            class="button is-text is-only-icon"
                            aria-label="delete id"
                            on:click|preventDefault={() => {
                                eventSet.delete(event);
                                $createFunction.events = Array.from(eventSet);
                            }}>
                            <span class="icon-x" aria-hidden="true" />
                        </button>
                    </TableCell>
                </li>
            {/each}
        </TableList>
    {:else}
        <Empty isButton on:click={() => (showCreate = !showCreate)}
            >Add a event to get started
        </Empty>
    {/if}

    <div class="u-flex u-margin-block-start-16">
        <Button text noMargin on:click={() => (showCreate = !showCreate)}>
            <span class="icon-plus" aria-hidden="true" />
            <span class="u-text">Add event</span>
        </Button>
    </div>
</WizardStep>

{#if showCreate}
    <EventModal bind:show={showCreate} on:created={handleCreated} />
{/if}