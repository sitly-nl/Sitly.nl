import Foundation

struct ChildCreateModel {
    let gender: Gender
    let birthDate: Date
    var traits = [ChildTrait]()
}

enum ChildUpdateType {
    case gender(Gender)
    case birthdate(Date)
    case genderAndBirthdate(gender: Gender, birthdate: Date)
    case traits([ChildTrait])

    func updateChild(_ child: Child) {
        switch self {
        case .gender(let gender):
            child.gender = gender
        case .birthdate(let birthdate):
            child.birthDate = birthdate
            birthdate.age.flatMap { child.age = $0 }
        case .genderAndBirthdate(let gender, let birthdate):
            child.gender = gender
            child.birthDate = birthdate
            birthdate.age.flatMap { child.age = $0 }
        case .traits(let traits):
            child.traits = traits
        }
    }
}

protocol ChildWebServicesProtocol {
    func createChild(model: ChildCreateModel, completion: @escaping ServerRequestCompletion<Child>)
    func deleteChild(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func updateChild(id: String, type: ChildUpdateType, completion: @escaping ServerRequestCompletion<JsonApiObject>)
}

extension ServerManager: ChildWebServicesProtocol {
    func createChild(model: ChildCreateModel, completion: @escaping ServerRequestCompletion<Child>) {
        let serverConnection = ServerConnection(endpoint: "users/me/children")
        serverConnection.httpMethod = .POST
        serverConnection.body = ["gender": model.gender.rawValue,
                                 "birthdate": DateFormatter.iso8601Formatter.string(from: model.birthDate),
                                 "traits": model.traits.map { $0.rawValue }] as [String: Any]
        serverConnection.execute {
            switch $0 {
            case .success(let jsonObj):
                if let child: Child = jsonObj.single() {
                    completion(.success(child))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func deleteChild(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "users/me/children/\(id)",
            httpMethod: .DELETE
        ).execute(completion: completion)
    }

    func updateChild(id: String, type: ChildUpdateType, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        let serverConnection = ServerConnection(endpoint: "users/me/children/\(id)")
        serverConnection.httpMethod = .PATCH
        switch type {
        case .gender(let gender):
            serverConnection.body = ["gender": gender.rawValue]
        case .birthdate(let birthdate):
            serverConnection.body = ["birthdate": DateFormatter.iso8601Formatter.string(from: birthdate)]
        case .genderAndBirthdate(let gender, let birthdate):
            serverConnection.body = [
                "gender": gender.rawValue,
                "birthdate": DateFormatter.iso8601Formatter.string(from: birthdate)
            ]
        case .traits(let traits):
            serverConnection.body = ["traits": traits.map { $0.rawValue }]
        }
        serverConnection.execute(completion: completion)
    }
}
