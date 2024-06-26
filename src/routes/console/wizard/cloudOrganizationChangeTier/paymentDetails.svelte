<script lang="ts">
    import { FormList, InputNumber } from '$lib/elements/forms';
    import InputChoice from '$lib/elements/forms/inputChoice.svelte';
    import { WizardStep } from '$lib/layout';
    import { sdk } from '$lib/stores/sdk';
    import { onMount } from 'svelte';
    import { changeOrganizationTier } from './store';
    import type { PaymentList, PaymentMethodData } from '$lib/sdk/billing';
    import { invalidate } from '$app/navigation';
    import { Dependencies } from '$lib/constants';
    import { initializeStripe, isStripeInitialized, submitStripeCard } from '$lib/stores/stripe';
    import { organization } from '$lib/stores/organization';
    import { showUsageRatesModal } from '$lib/stores/billing';
    import { PaymentBoxes } from '$lib/components/billing';
    import { page } from '$app/stores';

    let methods: PaymentList;
    let filteredMethods: PaymentMethodData[];
    let name: string;
    let budgetEnabled = false;
    let initialPaymentMethodId: string;
    onMount(async () => {
        methods = await sdk.forConsole.billing.listPaymentMethods();
        filteredMethods = methods?.paymentMethods.filter((method) => !!method?.last4);

        initialPaymentMethodId =
            $organization?.paymentMethodId ??
            $organization?.backupPaymentMethodId ??
            filteredMethods[0]?.$id ??
            null;
        $changeOrganizationTier.paymentMethodId = initialPaymentMethodId;
        $changeOrganizationTier.billingBudget = $organization?.billingBudget;
        budgetEnabled = !!$organization?.billingBudget;
    });

    async function handleSubmit() {
        if ($changeOrganizationTier.billingBudget < 0) {
            throw new Error('Budget cannot be negative');
        }
        if ($changeOrganizationTier.paymentMethodId) {
            const card = await sdk.forConsole.billing.getPaymentMethod(
                $changeOrganizationTier.paymentMethodId
            );
            if (!card?.last4) {
                throw new Error(
                    'The payment method you selected is not valid. Please select a different one.'
                );
            }
        } else {
            try {
                const method = await submitStripeCard(name, $page?.params?.organization ?? null);
                const card = await sdk.forConsole.billing.getPaymentMethod(method.$id);
                if (card?.last4) {
                    $changeOrganizationTier.paymentMethodId = method.$id;
                } else {
                    throw new Error(
                        'The payment method you selected is not valid. Please select a different one.'
                    );
                }

                invalidate(Dependencies.PAYMENT_METHODS);
            } catch (e) {
                throw new Error(e.message);
            }
        }
    }

    $: if ($changeOrganizationTier.paymentMethodId === null && !$isStripeInitialized) {
        initializeStripe();
    }

    $: if ($changeOrganizationTier.paymentMethodId) {
        isStripeInitialized.set(false);
    }

    $: if (!budgetEnabled) {
        $changeOrganizationTier.billingBudget = null;
    }
</script>

<WizardStep beforeSubmit={handleSubmit}>
    <svelte:fragment slot="title">Payment details</svelte:fragment>
    <svelte:fragment slot="subtitle">
        Confirm the payment method for your organization.
    </svelte:fragment>

    <FormList>
        <PaymentBoxes
            methods={filteredMethods}
            bind:name
            bind:group={$changeOrganizationTier.paymentMethodId} />

        <InputChoice
            type="switchbox"
            id="budget"
            label="Enable budget cap"
            tooltip="If enabled, you will be notified by email when your organization spend reaches 75% of the cap you set. Update your budget cap alerts in organization Settings."
            fullWidth
            bind:value={budgetEnabled}>
            <p class="text">
                Restrict your resource usage by setting a budget cap. <button
                    class="link"
                    type="button"
                    on:click={() => ($showUsageRatesModal = true)}>
                    Learn more about usage rates</button
                >.
            </p>
            {#if budgetEnabled}
                <div class="u-margin-block-start-16">
                    <InputNumber
                        id="budget"
                        label="Budget cap (USD)"
                        placeholder="0"
                        bind:value={$changeOrganizationTier.billingBudget} />
                </div>
            {/if}
        </InputChoice>
    </FormList>
</WizardStep>
