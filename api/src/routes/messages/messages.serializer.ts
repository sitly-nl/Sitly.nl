import { Serializer as JSONAPISerializer } from 'jsonapi-serializer';
import { Request } from 'express';
import { ParsedQs } from 'qs';
import { UrlUtil } from '../../utils/url-util';
import { MessageResponse } from '../../models/serialize/message-response';
import { User } from '../../models/user/user.model';
import { Message } from '../../models/message.model';
import { sub } from 'date-fns';
import { JobPosting } from '../../models/job-posting.model';
import { JobPostingAttributes, serializeJobPosting } from '../../models/serialize/job-posting-response';

interface SerializerPaginationData {
    page: number;
    pageCount: number;
    pageSize: number;
    rowCount: number;
}

export interface MessagesMeta {
    paginationInfo?: SerializerPaginationData;
    jobPosting?: JobPosting;
    meta: Record<string, unknown>;
}

const jobPostingAttrs = new JobPostingAttributes();

export const serializeMessages = async (data: Message | Message[], req: Request, user: User, metaInfo?: MessagesMeta) => {
    const serializer = new JSONAPISerializer('messages', {
        attributes: MessageResponse.keys,
        keyForAttribute: 'camelCase',
        jobPosting: {
            ref: 'id',
            attributes: jobPostingAttrs.getAttributeKeys(),
        },
        dataMeta: {
            action: (message: MessageResponse) => {
                return message.action;
            },
        },
    });

    serializer.opts.topLevelLinks = {};
    serializer.opts.meta = metaInfo?.meta ?? {};

    if (metaInfo?.paginationInfo) {
        const currentPage = metaInfo.paginationInfo.page;
        const lastPage = metaInfo.paginationInfo.pageCount;

        serializer.opts.meta.totalCount = metaInfo.paginationInfo.rowCount;
        serializer.opts.meta.totalPages = lastPage;

        let customParams = {};
        const createdBefore = (req.query?.filter as ParsedQs)?.['created-before'];
        const createdAfter = (req.query?.filter as ParsedQs)?.['created-after'];
        if (!createdBefore && !createdAfter) {
            customParams = {
                filter: {
                    'created-before': new Date().toISOString(),
                },
            };
        }

        serializer.opts.topLevelLinks = {
            ...serializer.opts.topLevelLinks,
            ...UrlUtil.createPaginationUrls(req, currentPage, lastPage, customParams),
        };
    }
    serializer.opts.topLevelLinks.newMessagesUrl = UrlUtil.createUrl(req, {
        ...req.query,
        page: undefined,
        filter: {
            'created-after': sub(new Date(), { seconds: 1 }).toISOString(),
        },
    });

    const jobPosting = metaInfo?.jobPosting;
    if (jobPosting) {
        serializer.opts.meta.jobPosting = await serializeJobPosting(jobPosting);
    }

    const mapped = await (Array.isArray(data)
        ? Promise.all(data.map(item => MessageResponse.instance(item, user)))
        : MessageResponse.instance(data, user));
    return serializer.serialize(mapped);
};
