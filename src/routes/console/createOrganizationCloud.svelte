<script lang="ts">
    import { Wizard } from '$lib/layout';
    import { sdk } from '$lib/stores/sdk';
    import { onDestroy } from 'svelte';
    import { addNotification } from '$lib/stores/notifications';
    import OrganizationDetails from './wizard/cloudOrganization/organizationDetails.svelte';
    import PaymentDetails from './wizard/cloudOrganization/paymentDetails.svelte';
    import InviteMembers from './wizard/cloudOrganization/inviteMembers.svelte';
    import ConfirmDetails from './wizard/cloudOrganization/confirmDetails.svelte';
    import {
        createOrganization,
        createOrganizationFinalAction,
        createOrgSteps
    } from './wizard/cloudOrganization/store';
    import { goto, invalidate, preloadData } from '$app/navigation';
    import { Dependencies } from '$lib/constants';
    import { Submit, trackEvent, trackError } from '$lib/actions/analytics';
    import { ID } from '@appwrite.io/console';
    import { page } from '$app/stores';
    import { wizard } from '$lib/stores/wizard';
    import { tierToPlan } from '$lib/stores/billing';
    import AddressDetails from './wizard/cloudOrganization/addressDetails.svelte';
    import HoodieCover from './(billing-modal)/hoodieCover.svelte';

    async function onFinish() {
        await invalidate(Dependencies.ORGANIZATION);
    }

    async function create() {
        try {
            const org = await sdk.forConsole.billing.createOrganization(
                $createOrganization.id ?? ID.unique(),
                $createOrganization.name,
                $createOrganization.billingPlan,
                $createOrganization.paymentMethodId
            );
            //Add billing address
            if ($createOrganization.billingAddressId) {
                await sdk.forConsole.billing.setBillingAddress(
                    org.$id,
                    $createOrganization.billingAddressId
                );
            } else if (
                $createOrganization.billingAddress &&
                $createOrganization.billingAddress.streetAddress
            ) {
                const response = await sdk.forConsole.billing.createAddress(
                    $createOrganization.billingAddress.country,
                    $createOrganization.billingAddress.streetAddress,
                    $createOrganization.billingAddress.city,
                    $createOrganization.billingAddress.state,
                    $createOrganization.billingAddress.postalCode,
                    $createOrganization.billingAddress.addressLine2
                        ? $createOrganization.billingAddress.addressLine2
                        : undefined
                );

                await sdk.forConsole.billing.setBillingAddress(org.$id, response.$id);
            }

            //Add budget
            if ($createOrganization?.billingBudget) {
                await sdk.forConsole.billing.updateBudget(
                    org.$id,
                    $createOrganization.billingBudget,
                    [75]
                );
            }

            //Add collaborators
            if ($createOrganization?.collaborators?.length) {
                $createOrganization.collaborators.forEach(async (collaborator) => {
                    await sdk.forConsole.teams.createMembership(
                        org.$id,
                        ['owner'],
                        collaborator,
                        undefined,
                        undefined,
                        `${$page.url.origin}/console/organization-${org.$id}`
                    );
                });
            }

            //Add tax ID
            if ($createOrganization?.taxId) {
                await sdk.forConsole.billing.updateTaxId(org.$id, $createOrganization.taxId);
            }

            await invalidate(Dependencies.ACCOUNT);
            await preloadData(`/console/organization-${org.$id}`);
            await goto(`/console/organization-${org.$id}`);
            addNotification({
                type: 'success',
                message: `${$createOrganization.name ?? 'Organization'} has been created`
            });
            trackEvent(Submit.OrganizationCreate, {
                customId: !!$createOrganization.id,
                plan: tierToPlan($createOrganization.billingPlan)?.name,
                budget_cap_enabled: !!$createOrganization?.billingBudget,
                members_invited: $createOrganization?.collaborators?.length
            });
            wizard.hide();
            if (org.billingPlan === 'tier-1') {
                wizard.showCover(HoodieCover);
            }
        } catch (e) {
            addNotification({
                type: 'error',
                message: e.mesage
            });
            trackError(e, Submit.OrganizationCreate);
        }
    }
    onDestroy(() => {
        $createOrganization = {
            id: null,
            name: null,
            billingPlan: 'tier-1',
            paymentMethodId: null,
            collaborators: [],
            billingAddressId: null,
            billingAddress: {
                $id: null,
                streetAddress: null,
                addressLine2: null,
                city: null,
                state: null,
                postalCode: null,
                country: null
            },
            taxId: null
        };
    });

    $createOrgSteps.set(1, {
        label: 'Organization',
        component: OrganizationDetails
    });
    $createOrgSteps.set(2, {
        label: 'Payment details',
        component: PaymentDetails
    });
    $createOrgSteps.set(3, {
        label: 'Address',
        component: AddressDetails
    });
    $createOrgSteps.set(4, {
        label: 'Members',
        component: InviteMembers
    });
    $createOrgSteps.set(5, {
        label: 'Review',
        component: ConfirmDetails
    });

    $wizard.finalAction = create;
</script>

<Wizard
    title="Create organization"
    steps={$createOrgSteps}
    finalAction={$createOrganizationFinalAction}
    on:exit={onFinish} />