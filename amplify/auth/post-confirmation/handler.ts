import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { type Schema } from "../../data/resource";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from "$amplify/env/post-confirmation";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env
);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

export const handler: PostConfirmationTriggerHandler = async (event) => {
    const { data: user, errors } = await client.models.UserProfile.create({
        email: event.request.userAttributes.email,
        name: event.request.userAttributes.name,
        profileOwner: `${event.request.userAttributes.sub}::${event.userName}`,
    });

    await client.models.Player.create({
        userProfileId: user?.email,
        name: event.request.userAttributes.name,
    });

  return event;
};