import { Dependencies } from '$lib/constants';
import { sdk } from '$lib/stores/sdk';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, depends }) => {
    depends(Dependencies.WEBHOOKS);

    return {
        webhooks: await sdk.forConsole.projects.listWebhooks(params.project)
    };
};
