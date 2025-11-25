import { User } from '../models/user/user.model';
import { UserRequest } from '../services/auth.service';

export class UserUpdatableProperties {
    static getSitlyUserUpdatableProperties = (sitlyUser: User) => {
        if (sitlyUser.webrole_id) {
            return sitlyUser.isParent
                ? UserUpdatableProperties.sitlyUserParentUpdatableProperties
                : UserUpdatableProperties.sitlyUserFosterUpdatableProperties;
        } else {
            return UserUpdatableProperties.sitlyUserUpdatableProperties;
        }
    };

    static getUserUpdatableProperties(req: UserRequest) {
        if (req.user?.webrole_id || (!req.user?.customUser.completed && req.body.role)) {
            return (req.body.role ?? req.user.roleName) === 'parent'
                ? UserUpdatableProperties.parentUpdatableProperties
                : UserUpdatableProperties.fosterUpdatableProperties;
        } else {
            return UserUpdatableProperties.updatableProperties;
        }
    }

    private static sitlyUserUpdatableProperties = [
        'email',
        'firstName',
        'lastName',
        'password',
        'about',
        'disabled',
        'receiveMatchMail',
        'hasPublicProfile',
        'subscriptionCancelled',
        'inappropriate',
        'suspected',
        'premium',
        'gracePeriod',
        'active',
        'notes',
    ];

    private static sitlyUserParentUpdatableProperties = [
        ...UserUpdatableProperties.sitlyUserUpdatableProperties,
        'availabilityPreference',
        'lookingForBabysitters',
        'lookingForChildminders',
    ];

    private static sitlyUserFosterUpdatableProperties = [
        ...UserUpdatableProperties.sitlyUserUpdatableProperties,
        'availability',
        'fosterChores',
        'averageHourlyRate',
        'isSmoker',
    ];

    private static updatableProperties = [
        'email',
        'firstName',
        'lastName',
        'password',
        'about',
        'role',
        'placeName',
        'postalCode',
        'streetName',
        'houseNumber',
        'latitude',
        'localeCode',
        'longitude',
        'avatar',
        'disabled',
        'invisible',
        'receiveNewMessagesMail',
        'receiveMatchMail',
        'hasPublicProfile',
        'shareProfileWithPartners',
        'subscriptionCancelled',
        'completed',
        'negativeFeedbackAccepted',
        'positiveFeedbackAccepted',
        'disabledSafetyMessages',
        'discountOfferedDate',
        'birthdate',
        'fosterLocation',
        'gender',
        'activeCouponCode',
    ];

    private static parentUpdatableProperties = [
        ...UserUpdatableProperties.updatableProperties,
        'availabilityPreference',
        'lookingForBabysitters',
        'lookingForChildminders',
        'lookingForOccasionalCare',
        'lookingForRegularCare',
        'lookingForRemoteTutor',
        'lookingForAfterSchool',
        'choresPreference',
        'hourlyRatesPreference',
    ];

    private static fosterUpdatableProperties = [
        ...UserUpdatableProperties.updatableProperties,
        'availability',
        'fosterChores',
        'averageHourlyRate',
        'ageGroupExperience',
        'yearsOfExperience',
        'isAvailableAfterSchool',
        'isAvailableOccasionally',
        'isAvailableRegularly',
        'isRemoteTutor',
        'isSmoker',
        'hasFirstAidCertificate',
        'hasCertificateOfGoodBehavior',
        'hasDriversLicense',
        'hasCar',
        'maxChildren',
        'hasReferences',
        'nativeLanguage',
        'languages',
        'isEducated',
        'education',
        'homepage',
        'availableFromDate',
        'occupation',
        'avatarOverlay',
        'skills',
        'traits',
    ];
}
