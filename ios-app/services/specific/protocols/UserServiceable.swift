import UIKit

protocol UserPersistenceServiceable {
    func save(users: [User])
    func getUser(id: String, completion: @escaping (User?) -> Void)
}

protocol UserDetailsServiceable {
    func isCurrentUser(user: User) -> Bool
}

protocol UserServiceable: UserPersistenceServiceable, UserDetailsServiceable {
    func reloadMe(completion: @escaping ServerRequestCompletion<User>)
    func fetchMe() -> User?
    func updateMe(type: UserUpdateType, completion: @escaping ServerRequestCompletion<User>)
    func togglePremium(on: Bool)

    func createChild(model: ChildCreateModel, user: User, completion: @escaping ServerRequestCompletion<Child>)
    func update(child: Child, type: ChildUpdateType, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func deleteChild(_ child: Child, completion: @escaping ServerRequestCompletion<JsonApiObject>)

    func createReference(model: ReferenceUpdateModel, user: User, completion: @escaping ServerRequestCompletion<Reference>)
    func update(updateReference: Reference, reference: Reference, completion: @escaping ServerRequestCompletion<Void>)
    func deleteReference(_ reference: Reference, completion: @escaping ServerRequestCompletion<JsonApiObject>)

    func hideUser(_ user: User)
    func fetchHiddenUsers() -> [User]
    func removeHidden(user: User)

    func updateVisitedPin(user: User)
    func fetchVisitedUsers() -> [User]?
}
