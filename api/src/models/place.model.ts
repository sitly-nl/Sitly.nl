import { BelongsTo, Column, DataType, ForeignKey, HasMany, Table } from 'sequelize-typescript';
import { CountryBaseModel } from './base.model';
import { LocaleId } from './locale.model';
import { WebRoleId } from './user/user.model';
import { BelongsToGetAssociationMixin, HasManyGetAssociationsMixin, Op } from 'sequelize';
import { StringUtil } from '../utils/string-util';
import { ElasticService } from '../services/elastic.service';
import { Province } from './province.model';
import { getKnex } from '../knex';
import { Knex } from 'knex';
import { Util } from '../utils/util';

export const zoomLevelForDensity = (density = 0) => {
    // density = users within a radius of 1km
    if (density <= 10) {
        return 12;
    } else if (density <= 50) {
        return 13;
    } else if (density <= 100) {
        return 14;
    } else if (density <= 300) {
        return 15;
    }
    return 16;
};

export class PlaceColumns extends CountryBaseModel<PlaceColumns, 'instance_id', 'instance_order' | 'active'> {
    @Column({ primaryKey: true, autoIncrement: true }) instance_id: number;

    @ForeignKey(() => Place)
    @Column(DataType.INTEGER)
    canonical_place_id: number | null;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Province)
    province_id: number | null;

    @Column({ defaultValue: 999999 }) instance_order: number;
    @Column({ allowNull: false, defaultValue: 1 }) active: 0 | 1;
    @Column(DataType.INTEGER) locale_id: LocaleId | null;
    @Column place_name: string;
    @Column place_url: string;
    @Column(DataType.STRING) english_place_name: string | null;
    @Column(DataType.STRING) english_place_url: string | null;
    @Column(DataType.INTEGER) map_latitude: number | null;
    @Column(DataType.INTEGER) map_longitude: number | null;
    @Column webuser_count: number;
    @Column featured: 0 | 1;
    @Column(DataType.INTEGER) babysit_count: number | null;
    @Column(DataType.INTEGER) babysit_jobs_count: number | null;
    @Column(DataType.INTEGER) childminder_count: number | null;
    @Column(DataType.INTEGER) childminder_jobs_count: number | null;
    @Column(DataType.INTEGER) parent_count_per_km: number | null;
    @Column(DataType.INTEGER) babysit_count_per_km: number | null;
    @Column(DataType.INTEGER) childminder_count_per_km: number | null;
}

@Table({ tableName: 'custom_module_places' })
export class Place extends PlaceColumns {
    @BelongsTo(() => Place) main?: Place;
    declare getMain: BelongsToGetAssociationMixin<Place>;
    @HasMany(() => Place) alternates?: Place[];
    declare getAlternates: HasManyGetAssociationsMixin<Place>;
    @BelongsTo(() => Province) province?: Province;

    static byKeyword(keyword: string, options: { limit?: number; localeId?: number } = {}) {
        return this.findAll({
            where: {
                place_url: {
                    [Op.startsWith]: StringUtil.safeString(keyword),
                },
                ...(options.localeId ? { [Op.or]: [{ locale_id: options.localeId }, { locale_id: null }] } : {}),
            },
            group: ['place_name'],
            order: [['webuser_count', 'DESC']],
            ...(options.limit ? { limit: options.limit } : {}),
        });
    }

    private static mergeCanonical(knex: Knex, qb: Knex.QueryBuilder, localeId?: number, mergePlaces?: boolean) {
        if (localeId) {
            qb.where(knex.raw(`(custom_module_places.locale_id = ${localeId} OR custom_module_places.locale_id IS NULL)`));
        }

        if (mergePlaces) {
            const allAttributesNames = Object.keys(this.getAttributes());
            const mergedAttributes = ['place_name', 'place_url', 'canonical_place_id'];
            qb.select([
                ...allAttributesNames.filter(item => !mergedAttributes.includes(item)).map(item => `p2.${item}`),
                ...mergedAttributes.map(item => `custom_module_places.${item}`),
            ]);
            qb.leftJoin(
                'custom_module_places as p2',
                knex.raw('IFNULL(custom_module_places.canonical_place_id, custom_module_places.instance_id)') as never,
                'p2.instance_id',
            );
        }
    }

    static byPlaceUrl(placeUrl: string, merge = false, localeId?: number) {
        const knex = getKnex();

        const qb = knex.queryBuilder();
        qb.from('custom_module_places');
        if (merge) {
            this.mergeCanonical(knex, qb, localeId);
        }
        qb.where('custom_module_places.place_url', placeUrl);
        if (localeId === LocaleId.en_GB) {
            qb.orWhere('custom_module_places.english_place_url', placeUrl);
        }

        const sql = qb.toSQL();
        return this.sequelize.query({ query: sql.sql, values: sql.bindings as string[] }, { model: this, plain: true });
    }

    static byDistance({
        lat,
        lng,
        distanceInKm,
        limit,
        options,
        localeId,
        mergePlaces,
    }: {
        lat: number;
        lng: number;
        distanceInKm: number;
        limit: number;
        options?: { exclude: number[] };
        localeId?: number;
        mergePlaces?: boolean;
    }) {
        const knex = getKnex();

        const qb = knex.queryBuilder();
        qb.from('custom_module_places');
        this.mergeCanonical(knex, qb, localeId, mergePlaces);
        const prefix = mergePlaces ? 'p2' : 'custom_module_places';
        const polygon = Util.createCirclePolygon(lat, lng, distanceInKm);
        const polygonFormatted = [];

        for (const coordinate of polygon) {
            polygonFormatted.push(`${coordinate.latitude} ${coordinate.longitude}`);
        }
        const queryPolygon = `POLYGON((${polygonFormatted.join(',')}))`;
        qb.whereRaw(`CONTAINS(GEOMFROMTEXT('${queryPolygon}'), POINT(${prefix}.map_latitude, ${prefix}.map_longitude))`);

        if (options?.exclude) {
            qb.whereNotIn(`${prefix}.instance_id`, options.exclude);
        }
        qb.where(`${prefix}.webuser_count`, '>=', 5);
        if (!mergePlaces) {
            qb.select('*');
        }

        qb.select(
            knex.raw(`
                ( 6371 * ACOS( COS( RADIANS(${lat}) )
                * COS( RADIANS( ${prefix}.map_latitude ) )
                * COS( RADIANS( ${prefix}.map_longitude ) - RADIANS(${lng}) )
                + SIN( RADIANS(${lat}) )
                * SIN( RADIANS( ${prefix}.map_latitude ) ) ) ) AS distance
            `),
        );
        qb.orderBy('distance');
        qb.limit(limit);

        const sql = qb.toSQL();
        return this.sequelize.query({ query: sql.sql, values: sql.bindings as string[] }, { model: this });
    }

    static async find(options: {
        localeId: LocaleId;
        mergePlaces: boolean;
        useAlternates: boolean;
        sortByUserCount: boolean;
        placeName?: string;
        filter?: {
            'featured'?: unknown;
            'user-count'?: { min?: string; max?: string };
            'exclude-places'?: string[];
        };
        page?: { pageSize: number; page: number };
    }) {
        const knex = getKnex();
        const qb = knex.queryBuilder();
        qb.from('custom_module_places');

        if (options.filter?.featured) {
            qb.where('custom_module_places.featured', 1);
        }
        if (options.filter?.['user-count']) {
            const { min, max } = options.filter['user-count'];
            if (min) {
                qb.where('custom_module_places.webuser_count', '>=', min);
            }
            if (max) {
                qb.where('custom_module_places.webuser_count', '<=', max);
            }
        }
        if (options.sortByUserCount) {
            const orderTable = options.mergePlaces ? 'p2' : 'custom_module_places';
            qb.orderByRaw(`${orderTable}.webuser_count DESC`);
        }
        const excludePlaces = options.filter?.['exclude-places'] as string[];
        if (excludePlaces) {
            qb.whereNotIn('custom_module_places.place_url', excludePlaces);
        }
        qb.where('custom_module_places.active', 1);

        if (options.placeName) {
            qb.where('custom_module_places.place_name', options.placeName);
        }

        this.mergeCanonical(knex, qb, options.localeId, options.mergePlaces);

        if (options.page) {
            const size = options.placeName ? 1 : options.page.pageSize;
            qb.limit(size);
            qb.offset((options.page.page - 1) * size);
        }

        const sql = qb.toSQL();
        const res = await this.sequelize.query({ query: sql.sql, values: sql.bindings as string[] }, { model: this });
        if (options.useAlternates) {
            if (options.mergePlaces) {
                await Promise.all(
                    res.map(async item => {
                        item.main = await item.getMain({ include: [{ association: 'alternates' }] });
                    }),
                );
            } else {
                await Promise.all(
                    res.map(async item => {
                        item.alternates = await item.getAlternates();
                    }),
                );
            }
        }
        return res;
    }

    async calculateDensity(elasticService: ElasticService) {
        const sampleRadius = 5;
        const sampleSizeSquared = Math.pow(sampleRadius, 2);
        const { map_latitude: lat, map_longitude: lng } = this;

        if (lat && Number.isFinite(lat) && lng && Number.isFinite(lng)) {
            try {
                const roleCounts = await elasticService.countUsers(lat, lng, sampleRadius);

                return this.update({
                    parent_count_per_km: Math.ceil(roleCounts.parent / sampleSizeSquared),
                    babysit_count_per_km: Math.ceil(roleCounts.babysitter / sampleSizeSquared),
                    childminder_count_per_km: Math.ceil(roleCounts.childminder / sampleSizeSquared),
                });
            } catch {}
        }
    }

    getInitialZoomLevel(role?: WebRoleId) {
        const userCount = role === WebRoleId.parent ? this.babysit_count_per_km : this.parent_count_per_km;
        return zoomLevelForDensity(userCount ?? undefined);
    }
}
