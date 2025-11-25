import { User } from 'app/models/api/user';
import { UserGroup } from 'app/models/api/user-group';

export class SearchResults {
    readonly users: User[];
    readonly userGroups: UserGroup[];
    readonly totalCount: number;
    readonly totalPages: number;

    constructor(users?: User[], userGroups?: UserGroup[], totalCount?: number, totalPages?: number) {
        this.users = users ?? [];
        this.userGroups = userGroups ?? [];
        this.totalCount = totalCount ?? 0;
        this.totalPages = totalPages ?? 0;
    }

    byUpdatingUsers(users: User[]) {
        return new SearchResults(users, this.userGroups, this.totalCount, this.totalPages);
    }
}
