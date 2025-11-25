import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { ModelAttributes } from '../model-attributes';
import { JobPosting } from '../job-posting.model';

export class JobPostingAttributes extends ModelAttributes {
    protected mappings = {
        id: 'instance_id',
        filter: 'filter',
        startAt: 'start_at',
        userId: 'webuser_id',
        lastSentAt: 'last_sent_at',
        batchCount: 'batch_count',
        state: 'state',
        repliesCount: 'repliesCount',
        handleStartTimeExceed: 'handle_start_time_exceed',
        created: 'created_at',
    };
}

const attributes = new JobPostingAttributes();
const serializer = new JSONAPISerializer('job-posting', {
    attributes: attributes.getAttributeKeys(),
    keyForAttribute: 'camelCase',
    transform: (item: { attributes: Record<string, unknown> }) => {
        return attributes.map(item.attributes);
    },
});

export const serializeJobPosting = async (jobPosting: JobPosting) => {
    return serializer.serialize({
        attributes: {
            ...jobPosting.dataValues,
            repliesCount: (await jobPosting.repliesCount()) ?? 0,
        },
    });
};
