import Foundation
import UIKit.UIImage

enum SignInType {
    case regular(email: String, password: String)
    case facebook(token: String)
    case apple(code: String)
    case google(token: String)
    case tempToken(token: String, country: Country)
}

enum UsersSearchEntities {
    case users([User])
    case groups([UsersGroups])

    var isUsers: Bool {
        switch self {
        case .users:
            return true
        default:
            return false
        }
    }

    var count: Int {
        switch self {
        case .users(let users):
            return users.count
        case .groups(let groups):
            return groups.count
        }
    }
}

struct CityStatistics {
    let averageHourlyRateFormatted: String
}

enum CityStatisticsType: String {
    case babysitters
    case childminders
}

protocol RemoteUserProviderProtocol {
    func getUser(id: String, completion: @escaping ServerRequestCompletion<User>)
    func getMe(completion: @escaping ServerRequestCompletion<User>)
}

protocol UserWebServicesProtocol: RemoteUserProviderProtocol {
    func signUp(model: SignUpModel, completion: @escaping ServerRequestCompletion<SignUpResponseModel>)
    func completeUserSignUp(completion: @escaping ServerRequestCompletion<User>)
    func signIn(type: SignInType, country: Country?, completion: @escaping ServerRequestCompletion<SignInResponseModel>)
    func initiateResetPassword(email: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func resetPassword(
        token: String,
        countryCode: String,
        password: String,
        completion: @escaping ServerRequestCompletion<SignInResponseModel>
    )
    func getAboutSuggestion(completion: @escaping ServerRequestCompletion<String>)
    func hourlyRateStatistic(completion: @escaping ServerRequestCompletion<String>)
    func searchUsers(_ searchForm: SearchForm, completion: @escaping ServerRequestCompletion<(entities: UsersSearchEntities, total: Int)>)
    func recommendationSuggestedUsers(completion: @escaping ServerRequestCompletion<[User]>)
    func recommendationLink(authorType: RecommendationRecepientType, completion: @escaping ServerRequestCompletion<String>)
    func updateMe(type: UserUpdateType, completion: @escaping ServerRequestCompletion<User>)
    func validate(about: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func disableMe(completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func deleteMe(completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func validatePurchasesReceipt(_ receipt: Data, amount: Double, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func postAPNStoken(_ deviceToken: String, fcmToken: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func getUpdates(completion: @escaping ServerRequestCompletion<UpdateModel>)
    func cityStatistic(place: String, type: CityStatisticsType, completion: @escaping ServerRequestCompletion<CityStatistics>)
}

extension ServerManager: UserWebServicesProtocol {
// MARK: - Auth
    func signUp(model: SignUpModel, completion: @escaping ServerRequestCompletion<SignUpResponseModel>) {
        var params: [String: Any] = ["email": model.user.email]

        switch model.type {
        case .regular(let password):
            params["password"] = password
        case .facebook(let token):
            params["facebookAccessToken"] = token
        case .appleToken(let token):
            params["appleToken"] = token
        case .googleToken(let token):
            params = ["googleAuthToken": token]
        }

        if case .facebook = model.type {
            // we are not adding any extra properties in that case
        } else {
            params["firstName"] = model.user.firstName
            params["lastName"] = model.user.lastName
        }

        ServerConnection(
            endpoint: "users",
            baseUrl: Server.baseURL + "/" + model.countryCode,
            httpMethod: .POST,
            body: params
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                guard let token = jsonObj.meta?["accessToken"] as? String else {
                    completion(.failure(.dataParsing(.missingField("signUp.jsonObj.accessToken"))))
                    return
                }
                guard let data = jsonObj.data as? [String: Any] else {
                    completion(.failure(.dataParsing(.missingField("signUp.jsonObj.data"))))
                    return
                }
                do {
                    let user = try User(data: JsonData(dict: data), includes: jsonObj.included)
                    user.completionUrl = (try? jsonObj.links?.valueForKey("completionUrl")) ?? user.completionUrl
                    completion(.success(SignUpResponseModel(user: user, token: token)))
                } catch let error as ParsingError {
                    completion(.failure(.dataParsing(error)))
                } catch let error {
                    completion(.failure(.dataParsing(.general(error))))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func completeUserSignUp(completion: @escaping ServerRequestCompletion<User>) {
        ServerConnection(
            endpoint: "users/me",
            httpMethod: .PATCH,
            queryDictionary: ["include": ServerManager.userMeIncludes],
            body: ["completed": true]
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                guard let data = jsonObj.data as? [String: Any] else {
                    completion(.failure(.dataParsing(.missingField("completeUserSignUp.jsonObj.data"))))
                    return
                }
                do {
                    let user = try User(data: JsonData(dict: data), includes: jsonObj.included)
                    completion(.success(user))
                } catch let error as ParsingError {
                    completion(.failure(.dataParsing(error)))
                } catch let error {
                    completion(.failure(.dataParsing(.general(error))))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func signIn(type: SignInType, country: Country?, completion: @escaping ServerRequestCompletion<SignInResponseModel>) {
        let body: Any
        var selectedCountry = country
        switch type {
        case .facebook(let token):
            body = ["facebookAccessToken": token]
        case .regular(let email, let password):
            body = ["email": email, "password": password]
        case .apple(let code):
            body = ["appleCode": code]
        case .google(let token):
            body = ["googleAuthToken": token]
        case .tempToken(let token, let country):
            selectedCountry = country
            body = ["tempToken": token]
        }

        ServerConnection(
            endpoint: "tokens",
            baseUrl: Server.baseURL + "/" + (selectedCountry?.rawValue ?? "main"),
            httpMethod: .POST,
            headers: [:],
            queryDictionary: ["include": "user,user.children,user.references,user.photos"],
            body: body
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                guard let data = jsonObj.data as? [String: Any] else {
                    completion(.failure(.dataParsing(.missingField("signIn.jsonObj.data"))))
                    return
                }
                do {
                    let model = try SignInResponseModel(
                        signInData: JsonData(dict: data),
                        includes: jsonObj.included,
                        meta: jsonObj.meta,
                        links: jsonObj.links
                    )
                    completion(.success(model))
                } catch let error as ParsingError {
                    completion(.failure(.dataParsing(error)))
                } catch let error {
                    completion(.failure(.dataParsing(.general(error))))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func initiateResetPassword(email: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "users/password-reset-token",
            httpMethod: .POST,
            body: ["email": email]
        ).execute(completion: completion)
    }

    func resetPassword(
        token: String,
        countryCode: String,
        password: String,
        completion: @escaping ServerRequestCompletion<SignInResponseModel>
    ) {
        ServerConnection(
            endpoint: "users/password",
            httpMethod: .POST,
            queryDictionary: ["include": "access-token,user,user.children,user.references,user.photos"],
            body: ["token": token, "password": password, "countryCode": countryCode]
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                guard let data = jsonObj.data as? [String: Any] else {
                    completion(.failure(.dataParsing(.missingField("resetPassword.jsonObj.data"))))
                    return
                }
                do {
                    let model = try SignInResponseModel(
                        resetPasswordData: JsonData(dict: data),
                        includes: jsonObj.included,
                        meta: jsonObj.meta
                    )
                    completion(.success(model))
                } catch let error as ParsingError {
                    completion(.failure(.dataParsing(error)))
                } catch let error {
                    completion(.failure(.dataParsing(.general(error))))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

// MARK: - Get users
    func getMe(completion: @escaping ServerRequestCompletion<User>) {
        ServerConnection(
            endpoint: "users/me",
            queryDictionary: ["include": ServerManager.userMeIncludes]
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                if let user: User = jsonObj.single() {
                    completion(.success(user))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
                // force log out user when not found, this means that user was deleted or hidden.
                if case .client(.userNotFound) = error {
                    NotificationCenter.default.post(name: .userBecameUnauthorized, object: nil)
                }
            }
        }
    }

    func getAboutSuggestion(completion: @escaping ServerRequestCompletion<String>) {
        ServerConnection(endpoint: "users/me/about-suggestion").execute {
            switch $0 {
            case .success(let jsonObj):
                if let text = jsonObj.object as? String {
                    completion(.success(text))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func hourlyRateStatistic(completion: @escaping ServerRequestCompletion<String>) {
        ServerConnection(endpoint: "users/me/hourly-rates-statistic").execute {
            switch $0 {
            case .success(let jsonObj):
                if let dict = jsonObj.data as? [String: Any],
                   let text: String = try? dict.valueForKey("attributes", ofType: [String: Any].self).valueForKey("statisticString") {
                    completion(.success(text))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func getUser(id: String, completion: @escaping ServerRequestCompletion<User>) {
        ServerConnection(
            endpoint: "users/\(id)",
            queryDictionary: ["include": "children,references,recommendations,photos,similar-users.children,similar-users.recommendations"]
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                if let user: User = jsonObj.single() {
                    completion(.success(user))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func searchUsers(_ searchForm: SearchForm, completion: @escaping ServerRequestCompletion<(entities: UsersSearchEntities, total: Int)>) {
        ServerConnection(
            endpoint: "users",
            queryDictionary: searchForm.serverDictionaryRepresentation.merging(["include": "children,recommendations"]) { $1 }
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                let groups: [UsersGroups] = jsonObj.multiple()
                if groups.count > 0 {
                    completion(.success((
                        .groups(groups),
                        groups.reduce(0, { $0 + $1.count })
                    )))
                } else {
                    completion(.success((
                        .users(jsonObj.multiple()),
                        (jsonObj.meta?["totalCount"] as? Int) ?? 0
                    )))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

// MARK: - Recommendations
    func recommendationSuggestedUsers(completion: @escaping ServerRequestCompletion<[User]>) {
        ServerConnection(
            endpoint: "users/me/recommendations/suggested-users",
            queryDictionary: ["include": "children"]
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                completion(.success(jsonObj.multiple()))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func recommendationLink(authorType: RecommendationRecepientType, completion: @escaping ServerRequestCompletion<String>) {
        var body = ["firstName": authorType.name]
        if case .user(let user) = authorType {
            body["authorId"] = user.id
        }
        ServerConnection(
            endpoint: "users/me/recommendations/links",
            httpMethod: .POST,
            body: body
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                if  let dict = jsonObj.object as? [String: Any],
                    let url: String = try? dict.valueForKey("links", ofType: [String: Any].self).valueForKey("recommendationUrl") {
                        completion(.success(url))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

// MARK: - Update
    func updateMe(type: UserUpdateType, completion: @escaping ServerRequestCompletion<User>) {
        ServerConnection(
            endpoint: "users/me",
            httpMethod: .PATCH,
            queryDictionary: ["include": ServerManager.userMeIncludes],
            body: type.serverRepresentation
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                if let user: User = jsonObj.single() {
                    completion(.success(user))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func validate(about: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "users/me",
            httpMethod: .PATCH,
            queryDictionary: ["validate": "values"],
            body: ["about": about]
        ).execute(completion: completion)
    }

    func disableMe(completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "users/me",
            httpMethod: .PATCH,
            body: ["disabled": true]
        ).execute(completion: completion)
    }

    func deleteMe(completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "users/me",
            httpMethod: .DELETE
        ).execute(completion: completion)
    }

// MARK: -
    func validatePurchasesReceipt(_ receipt: Data, amount: Double, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        let serverConnection = ServerConnection(endpoint: "users/me/payments")
        serverConnection.httpMethod = .POST
        serverConnection.body = ["iTunesReceipt": receipt.base64EncodedString(),
                                 "amount": String(format: "%.2f", amount)]
        serverConnection.execute(completion: completion)
    }

    func postAPNStoken(_ deviceToken: String, fcmToken: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        let serverConnection = ServerConnection(endpoint: "users/me/devices")
        serverConnection.httpMethod = .POST
        serverConnection.body = ["deviceType": "ios",
                                 "fcmToken": fcmToken,
                                 "deviceToken": deviceToken]
        serverConnection.execute(completion: completion)
    }

// MARK: - Additional data
    func getUpdates(completion: @escaping ServerRequestCompletion<UpdateModel>) {
        ServerConnection(
            endpoint: "users/me/updates",
            queryDictionary: ["version": "new"]
        ).execute {
            switch $0 {
            case .success(let jsonObj):
//                debugLog("\n\n\(jsonObj)\n\n")
                if let model: UpdateModel = jsonObj.single() {
                    completion(.success(model))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func cityStatistic(place: String, type: CityStatisticsType, completion: @escaping ServerRequestCompletion<CityStatistics>) {
        ServerConnection(
            endpoint: "users/city-statistics",
            queryDictionary: [
                "filter": [
                    "place": place
                ],
                "type": type.rawValue
            ],
            sendToken: false
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                if let hourlyRate = jsonObj.meta?["averageHourlyRateFormatted"] as? String {
                    completion(.success(CityStatistics(averageHourlyRateFormatted: hourlyRate)))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
}
