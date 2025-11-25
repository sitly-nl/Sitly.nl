import { ElasticService } from './elastic.service';
import { Op } from 'sequelize';
import { getModels } from '../sequelize-connections';
import { BrandCode } from '../models/brand-code';
import { sub } from 'date-fns';
import { Logger } from 'winston';
import { LogFactory } from '../../scripts-src/services/log-statement-factory.service';
import { DateUtil } from '../utils/date-util';
import { User, UserColumns } from '../models/user/user.model';
import { PhotoService } from './photo.service';
import { CustomUserColumns } from '../models/user/custom-user.model';

export class CleanUsersService {
    private static sitlyUserPropertiesToDelete: Partial<UserColumns> = {
        email: null,
        last_name: null,
    };

    private static sitlyUserCustomPropertiesToDelete: Partial<CustomUserColumns> = {
        address: null,
        about: null,
        map_latitude: null,
        map_longitude: null,
        facebook_id: null,
        facebook_email: null,
        deleted: 1,
        avatar_url: null,
    };

    static async softDelete(user: User) {
        await Promise.all([PhotoService.deleteUserAvatar(user), PhotoService.deleteUserPhotos(user)]);

        await Promise.all([
            user.update(CleanUsersService.sitlyUserPropertiesToDelete),
            user.customUser.update(CleanUsersService.sitlyUserCustomPropertiesToDelete),
            user.sequelize.models.Recommendation.deleteByUserId(user.webuser_id),
        ]);
    }

    static async deleteIncomplete(brandCode: BrandCode, logger: Logger, scriptLogIdentifier: string) {
        const models = getModels(brandCode);
        const res = await models.User.findAll({
            attributes: ['webuser_id'],
            where: {
                created: { [Op.lt]: DateUtil.dateToTimestamp(sub(new Date(), { years: 5 })) },
            },
            include: {
                association: 'customUser',
                attributes: [],
                where: { completed: 0 },
            },
        });
        const idsToDelete = res.map(item => item.webuser_id);

        idsToDelete.forEach(id => {
            logger.info(LogFactory.incompleteUserDeletionLog(id, brandCode, scriptLogIdentifier));
        });

        const [state, usersDeleted] = await Promise.all([
            ElasticService.getSearchInstance(brandCode).deleteUsers(idsToDelete),
            models.User.destroy({ where: { webuser_id: idsToDelete } }),
        ]);

        logger.info(LogFactory.elasticDelOpLog(idsToDelete.length, state.length, brandCode, scriptLogIdentifier));
        logger.info(LogFactory.userDBDelLog(idsToDelete.length, usersDeleted, brandCode, scriptLogIdentifier));
    }

    static async deleteGhostInspectorUsers(brandCode: BrandCode, logger: Logger, scriptLogIdentifier: string) {
        const usersToDelete = await CleanUsersService.getGhostInspectorUsers(brandCode);
        const idsToDelete = usersToDelete.map(item => item.webuser_id);

        usersToDelete.forEach(user => {
            logger.info(LogFactory.userDeletionLog(user, scriptLogIdentifier));
        });

        const [state, usersDeleted] = await Promise.all([
            ElasticService.getSearchInstance(brandCode).deleteUsers(idsToDelete),
            getModels(brandCode).User.destroy({ where: { webuser_id: idsToDelete } }),
        ]);

        logger.info(LogFactory.elasticDelOpLog(usersToDelete.length, state.length, brandCode, scriptLogIdentifier));
        logger.info(LogFactory.userDBDelLog(usersToDelete.length, usersDeleted, brandCode, scriptLogIdentifier));
    }

    private static async getGhostInspectorUsers(brandCode: BrandCode) {
        const oneHourAgo = Math.round(Date.now() / 1000) - 60 * 60;
        return getModels(brandCode).User.findAll({
            where: {
                created: {
                    [Op.lt]: oneHourAgo,
                },
                [Op.or]: [
                    { first_name: 'Ghost-Sitly' },
                    { first_name: 'Ghost' },
                    { email: { [Op.like]: 'testing+%@sitly.com' } },
                    { email: { [Op.like]: '%@email.ghostinspector.com' } },
                ],
            },
        });
    }
}
