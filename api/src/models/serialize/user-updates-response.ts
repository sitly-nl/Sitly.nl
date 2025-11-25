import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { JobPosting } from '../job-posting.model';
import { Prompt } from '../prompt.model';
import { PromptResponse } from './prompt-response';
import { JobPostingAttributes } from './job-posting-response';

interface UserUpdates {
    totalUnreadMessagesCount: number;
    unviewedInvitesCount: number;
    isPremium: boolean;
    jobPosting?: JobPosting;
    prompt?: Prompt;
}

export class UserUpdatesResponse {
    static keys: (keyof UserUpdatesResponse)[] = ['totalUnreadMessagesCount', 'unviewedInvitesCount', 'isPremium', 'jobPosting', 'prompt'];

    totalUnreadMessagesCount = this.update.totalUnreadMessagesCount;
    unviewedInvitesCount = this.update.unviewedInvitesCount;
    isPremium = this.update.isPremium;
    jobPosting = this.update.jobPosting ? new JobPostingAttributes().map(this.update.jobPosting as never) : undefined;
    prompt = this.update.prompt ? PromptResponse.instance(this.update.prompt) : undefined;

    private constructor(private update: UserUpdates) {}

    static instance(update: UserUpdates) {
        return new UserUpdatesResponse(update);
    }
}

const serializer = new JSONAPISerializer('updates', {
    attributes: UserUpdatesResponse.keys,
    keyForAttribute: 'camelCase',
    jobPosting: {
        ref: 'id',
        attributes: new JobPostingAttributes().getAttributeKeys(),
    },
    prompt: {
        ref: 'id',
        attributes: PromptResponse.keys,
    },
});

export const serializeUserUpdates = (prompt: UserUpdates) => {
    return serializer.serialize(UserUpdatesResponse.instance(prompt));
};
