import { BaseApiModel } from 'app/models/api/response';

export class Recommendation extends BaseApiModel {
    authorName: string;
    description: string;
    created: string;
    score: number;
}
