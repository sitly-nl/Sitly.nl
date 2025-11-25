export enum MessageType {
    regular = 'regular',
    askRecommendation = 'askRecommendation',
    jobPostingReply = 'jobPostingReply',
    jobPostingRejection = 'jobPostingRejection',
    safetyTips = 'safetyTips',
    instantJob = 'instantJob',
    autoRejection = 'autoRejection',
}

export interface MessagesCountStatisticItem {
    count: number;
    first_message_created: number;
}
export interface MessagesCountStatistic {
    last_hour: MessagesCountStatisticItem;
    last_day: MessagesCountStatisticItem;
    last_2_days: MessagesCountStatisticItem;
    last_week: MessagesCountStatisticItem;
    last_month: MessagesCountStatisticItem;
}
