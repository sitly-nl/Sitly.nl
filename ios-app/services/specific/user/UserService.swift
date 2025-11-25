import RealmSwift
import MapKit

struct Address {
    let city: String
    let street: String
    var coordinate: CLLocationCoordinate2D?
    var houseNumber: String?
    var postalCode: String?

    var serverDictionaryRepresentation: [String: Any] {
        var dict: [String: Any] = ["placeName": city,
                                  "streetName": street]
        if let coordinate {
            dict["latitude"] = coordinate.latitude
            dict["longitude"] = coordinate.longitude
        }
        if let houseNumber = houseNumber, !houseNumber.isEmpty {
            dict["houseNumber"] = houseNumber
        }
        if let postalCode = postalCode, !postalCode.isEmpty {
            dict["postalCode"] = postalCode
        }
        return dict
    }
}

extension Address: JsonApiMappable {
    init(data: JsonData, includes: [[String: Any]]?) throws {
        let attributes = data.attributes
        city = try attributes.valueForKey("placeName")
        street = try attributes.valueForKey("streetName")
        houseNumber = try? attributes.valueForKey("houseNumber")
        postalCode = try? attributes.valueForKey("postalCode")
    }
}

class UserService: UserServiceable, GeneralServicesInjected, KeychainManagerInjected, AuthServiceInjected {
// MARK: - Me
    func reloadMe(completion: @escaping ServerRequestCompletion<User>) {
        serverManager.getMe { response in
            if case .success(let user) = response {
                self.authService.updateEmail(newEmail: user.email)
                try? self.realm?.write {
                    self.realm?.add(user, update: .all)
                }
            }
            completion(response)
        }
    }

    func fetchMe() -> User? {
        return authService.email.flatMap { fetchUser(email: $0) }
    }

    func updateMe(type: UserUpdateType, completion: @escaping ServerRequestCompletion<User>) {
        updateMe(type: type, callCompletionForUpdate: true, completion: completion)
    }

    func updateMe(type: UserUpdateType, callCompletionForUpdate: Bool, completion: @escaping ServerRequestCompletion<User>) {
        if let currenUser = authService.currentUser {
            realm?.write {
                type.updateUser(currenUser)
                realm?.add(currenUser, update: .all)
                if callCompletionForUpdate {
                    completion(.success(currenUser))
                }
            }
        }

        serverManager.updateMe(type: type) { response in
            switch response {
            case .success(let user):
                try? self.realm?.write {
                    self.realm?.add(user, update: .all)
                }
                if case .address = type {
                    NotificationCenter.default.post(name: .needsUpdateSearch, object: nil)
                }
                completion(.success(user))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func togglePremium(on: Bool) {
        if let user = authService.currentUser {
            realm?.write {
                user.premium = on
                self.realm?.add(user, update: .all)
            }
        }
    }

// MARK: - Users
    func fetchUser(email: String) -> User? {
        return realm?.objects(User.self).filter(NSPredicate(format: "email ==[c] %@", email)).first
    }

    func isCurrentUser(user: User) -> Bool {
        return authService.currentUser?.id.equalsIgnoreCase(user.id) ?? false
    }

    func save(users: [User]) {
        DispatchQueue.main.async { [weak self] in
            for user in users {
                try? self?.realm?.write {
                    self?.realm?.add(user, update: .all)
                }
            }
        }
    }

    func getUser(id: String, completion: @escaping (User?) -> Void) {
        DispatchQueue.main.async { [weak self] in
            let user = self?.realm?.objects(User.self).filter(NSPredicate(format: "id == %@", id)).first
            completion(user)
        }
    }

// MARK: - Children
    func createChild(model: ChildCreateModel, user: User, completion: @escaping ServerRequestCompletion<Child>) {
        serverManager.createChild(model: model) { response in
            switch response {
            case .success(let child):
                self.realm?.write {
                    self.realm?.add(child, update: .all)
                    user.children.append(child)
                    self.realm?.add(user, update: .all)
                }
                completion(.success(child))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func update(child: Child, type: ChildUpdateType, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        realm?.write {
            type.updateChild(child)
            self.realm?.add(child, update: .all)
        }
        serverManager.updateChild(id: child.id, type: type, completion: completion)
    }

    func deleteChild(_ child: Child, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        serverManager.deleteChild(id: child.id) { response in
            switch response {
            case .success(let responseObj):
                try? self.realm?.write {
                    self.realm?.delete(child)
                }
                completion(.success(responseObj))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

// MARK: - References
    func createReference(model: ReferenceUpdateModel, user: User, completion: @escaping ServerRequestCompletion<Reference>) {
        serverManager.createReference(model: model) { response in
            switch response {
            case .success(let reference):
                self.realm?.write {
                    self.realm?.add(reference, update: .all)
                    user.references.append(reference)
                    self.realm?.add(user, update: .all)
                }
                completion(.success(reference))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func update(updateReference: Reference, reference: Reference, completion: @escaping ServerRequestCompletion<Void>) {
        realm?.write {
            reference.familyName = updateReference.familyName
            reference.referenceDescription = updateReference.referenceDescription
            self.realm?.add(reference, update: .all)
        }

        completion(.success(Void()))
        serverManager.updateReference(reference) { response in
            if case .failure(let error) = response {
                completion(.failure(error))
            }
        }
    }

    func deleteReference(_ reference: Reference, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        serverManager.deleteReference(id: reference.id) { response in
            switch response {
            case .success(let responseObj):
                try? self.realm?.write {
                    self.realm?.delete(reference)
                }
                completion(.success(responseObj))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

// MARK: - Hide user
    func fetchHiddenUsers() -> [User] {
        return realm.flatMap { Array($0.objects(User.self).filter("isHidden == 1")) } ?? []
    }

    func hideUser(_ user: User) {
        realm?.write {
            user.isHidden = true
            self.realm?.add(user, update: .all)
        }
    }

    func removeHidden(user: User) {
        realm?.write {
            user.isHidden = false
        }
    }

// MARK: - Visited users
    func updateVisitedPin(user: User) {
        self.realm?.write {
            user.hasVisitedPin = true
            self.realm?.add(user, update: .all)
        }
    }

    func fetchVisitedUsers() -> [User]? {
        return realm.flatMap { Array($0.objects(User.self).filter("hasVisitedPin == 1")) }
    }
}
