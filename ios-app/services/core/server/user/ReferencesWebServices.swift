import Foundation

struct ReferenceUpdateModel {
    let familyName: String
    let referenceDescription: String
}

protocol ReferencesWebServicesProtocol {
    func createReference(model: ReferenceUpdateModel, completion: @escaping ServerRequestCompletion<Reference>)
    func updateReference(_ reference: Reference, completion: @escaping ServerRequestCompletion<Reference>)
    func deleteReference(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
}

extension ServerManager: ReferencesWebServicesProtocol {
    func createReference(model: ReferenceUpdateModel, completion: @escaping ServerRequestCompletion<Reference>) {
        let serverConnection = ServerConnection(endpoint: "users/me/references")
        serverConnection.httpMethod = .POST
        serverConnection.body = ["familyName": model.familyName,
                                 "description": model.referenceDescription]
        serverConnection.execute {
            switch $0 {
            case .success(let jsonObj):
                if let reference: Reference = jsonObj.single() {
                    completion(.success(reference))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func updateReference(_ reference: Reference, completion: @escaping ServerRequestCompletion<Reference>) {
        let serverConnection = ServerConnection(endpoint: "users/me/references/\(reference.id)")
        serverConnection.httpMethod = .PATCH
        serverConnection.body = ["familyName": reference.familyName,
                                 "description": reference.referenceDescription]
        serverConnection.execute {
            switch $0 {
            case .success(let jsonObj):
                if let reference: Reference = jsonObj.single() {
                    completion(.success(reference))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func deleteReference(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "users/me/references/\(id)",
            httpMethod: .DELETE
        ).execute(completion: completion)
    }
}
