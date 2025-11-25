import { ElasticQuery } from '../elastic-search-builder';
import { LatLng } from '../user-search-elastic';
import { DayAvailabilityInterface } from '../../models/serialize/user-response';
import {
    fostersRelevanceScoringFunctions,
    parentsRelevanceScoringFunctions,
    parentsTestRelevanceScoringFunctions,
} from './relevance-scoring-functions';
import { Util } from '../../utils/util';
import { Child } from '../../models/child.model';
import { User } from '../../models/user/user.model';

export type SearchAvailability = Partial<{
    monday: Partial<DayAvailabilityInterface>;
    tuesday: Partial<DayAvailabilityInterface>;
    wednesday: Partial<DayAvailabilityInterface>;
    thursday: Partial<DayAvailabilityInterface>;
    friday: Partial<DayAvailabilityInterface>;
    saturday: Partial<DayAvailabilityInterface>;
    sunday: Partial<DayAvailabilityInterface>;
}>;

export type RelevanceScoringWeights =
    | Record<keyof typeof parentsRelevanceScoringFunctions, number>
    | Record<keyof typeof fostersRelevanceScoringFunctions, number>;

export class ScoringOptions {
    weights: RelevanceScoringWeights = this.searchFosters
        ? {
              distance: 50,
              lastSearchActivity: 30,
              lastSearchActivityConst: 50,
              receivedMessageCount: 50,
              babyExperience: 30,
              availability: 42,
              premium: 10,
              avatar: 25,
              aboutLength: 25,
              neutralRecommendations: 50,
              positiveRecommendations: 65,
              childrenCount: 50,
          }
        : {
              distance: 50,
              lastSearchActivity: 30,
              lastSearchActivityConst: 50,
              receivedMessageCount: 50,
              receivedInvitesCountLastDay: 100,
              babyExperience: 30,
              availability: 42,
              premium: 10,
              maxBabysitChildren: 50,
          };
    isTest = false;
    children?: Child[];
    maxBabysitChildren?: number;
    typeExperience?: string;

    constructor(
        public searchFosters: boolean,
        public locationOptions: { maxDistance: number; center: LatLng } | undefined,
        public availability: SearchAvailability | undefined,
    ) {}

    static async defaultInstance({
        user,
        availability,
        locationOptions,
    }: {
        user: User;
        availability?: SearchAvailability;
        locationOptions?: { maxDistance: number; center: LatLng };
    }) {
        const scoringOptions = new ScoringOptions(user.isParent, locationOptions, availability);
        if (user.isParent) {
            await user.customUser.loadRelationIfEmpty('children');
            if (user.customUser.children) {
                scoringOptions.children = user.customUser.children;
            }
        } else {
            const maxChildren = Number(user.customUser.max_babysit_children);
            scoringOptions.maxBabysitChildren = isNaN(maxChildren) ? 5 : maxChildren;
            scoringOptions.typeExperience = user.customUser.type_experience ?? undefined;
        }
        return scoringOptions;
    }

    toJSON(query: ElasticQuery) {
        if (query.bool) {
            const availabilityShould = this.availabilityDayParts();
            if (availabilityShould.length) {
                const currentShould = query.bool?.should ?? [];
                query.bool.should = currentShould.concat(availabilityShould);
                query.bool.minimum_should_match = currentShould.length + 1;
            }

            if (this.locationOptions) {
                if (!query.bool.filter) {
                    query.bool.filter = [];
                }
                query.bool.filter.push({
                    geo_distance: {
                        distance: `${this.locationOptions.maxDistance}km`,
                        map_point: {
                            lat: this.locationOptions.center.latitude,
                            lon: this.locationOptions.center.longitude,
                        },
                    },
                });
            }
        }

        const functionsBuilder = this.isTest
            ? this.searchFosters
                ? fostersRelevanceScoringFunctions
                : parentsTestRelevanceScoringFunctions
            : this.searchFosters
              ? fostersRelevanceScoringFunctions
              : parentsRelevanceScoringFunctions;
        const functions = Util.entries(this.weights)
            .map(([key, value]) => functionsBuilder[key](value, this))
            .filter(Boolean)
            .flatMap(item => item);

        return {
            function_score: {
                query,
                functions,
                boost_mode: 'replace',
                score_mode: 'sum',
            },
        };
    }

    availabilityDayParts() {
        if (this.availability) {
            const prefix = this.searchFosters ? 'foster' : 'pref';
            return Util.keysOf(this.availability).reduce(
                (acc, cur) => {
                    Util.keysOf(this.availability?.[cur] ?? {}).forEach(dayPart => {
                        if (this.availability?.[cur]?.[dayPart]) {
                            acc.push({
                                match: {
                                    [`${prefix}_${cur}_formatted`]: dayPart,
                                },
                            });
                        }
                    });
                    return acc;
                },
                [] as { match: Record<string, string> }[],
            );
        }
        return [];
    }
}
