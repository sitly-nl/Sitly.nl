import Foundation

enum ClientError: LocalizedError {
    case general([String: Any])
    case emailAlreadyExists
    case emailNotExist
    case userNotFound
    case invalidAddress
    case invalidStreetOrHouseNumber(MapBounds)
    case invalidHouseNumber
    case aboutContainsPersonalInfo
    case avatarValidation(AvatarValidationResult)
    case emailInMultipleCountries([Country])
    case invitesLimitExceeded
    case paymentByPremiumUser
    case messagesLimitExceeded
    case invalidFirstName
    case invalidLastName

    var errorDescription: String? {
        let errorName: String
        switch self {
        case .general:
            return NSLocalizedString("somethingWentWrong", comment: "")
        case .emailAlreadyExists:
            errorName = "emailAlreadyExists"
        case .emailNotExist:
            errorName = "emailNotExist"
        case .userNotFound:
            errorName = "userNotFound"
        case .invalidAddress:
            errorName = "invalidAddress"
        case .invalidStreetOrHouseNumber:
            errorName = "invalidStreetOrHouseNumber"
        case .invalidHouseNumber:
            errorName = "invalidHouseNumber"
        case .aboutContainsPersonalInfo:
            errorName = "aboutContainsPersonalInfo"
        case .avatarValidation:
            errorName = ""
        case .emailInMultipleCountries:
            errorName = ""
        case .invitesLimitExceeded:
            errorName = "invitesLimitExceeded"
        case .paymentByPremiumUser:
            errorName = "paymentByPremiumUser"
        case .messagesLimitExceeded:
            errorName = "messagesLimitExceeded"
        case .invalidFirstName:
            errorName = "invalidFirstName"
        case .invalidLastName:
            errorName = "invalidLastName"
        }
        return NSLocalizedString("error.server.\(errorName)", comment: "")
    }

    init(data: Any?) {
        guard
            let firstErrorDict = (data as? [String: Any]).flatMap({ $0["errors"] as? [[String: Any]] })?.first,
            let code = firstErrorDict["title"] as? String
        else {
            self = .general(["code": "-some unknown error-"])
            return
        }

        switch code {
        case "This e-mail already exists":
            self = .emailAlreadyExists
        case "Email address does not exist":
            self = .emailNotExist
        case "User not found":
            self = .userNotFound
        case "Invalid address":
            self = .invalidAddress
        case "Invalid street or house number":
            guard
                let placeBoundsDict = (firstErrorDict["meta"] as? [String: Any]).flatMap({ $0["placeBounds"] as? [String: Any] }),
                let bounds = try? MapBounds(
                    north: placeBoundsDict.valueForKey("north"),
                    east: placeBoundsDict.valueForKey("east"),
                    south: placeBoundsDict.valueForKey("south"),
                    west: placeBoundsDict.valueForKey("west"))
            else {
                self = .general(firstErrorDict)
                return
            }
            self = .invalidStreetOrHouseNumber(bounds)
        case "Housenumber must contain a number":
            self = .invalidHouseNumber
        case "About contains personal info":
            self = .aboutContainsPersonalInfo
        case "Avatar validation failed":
            guard
                let meta = (firstErrorDict["meta"] as? [String: Any]),
                let mandatory = (meta["mandatory"] as? [String])?.compactMap({ AvatarValidationWarning(rawValue: $0) }),
                let optional = (meta["optional"] as? [String])?.compactMap({ AvatarValidationWarning(rawValue: $0) })
            else {
                self = .general(firstErrorDict)
                return
            }
            self = .avatarValidation(AvatarValidationResult(mandatory: mandatory, optional: optional))
        case "Email used in more than one country":
            guard
                let meta = (firstErrorDict["meta"] as? [String: Any]),
                let countryCodes = (meta["countryCodes"] as? [String])?.compactMap({ Country(rawValue: $0) })
            else {
                self = .general(firstErrorDict)
                return
            }
            self = .emailInMultipleCountries(countryCodes)
        case "Too many invites sent":
            self = .invitesLimitExceeded
        case "Too many initial messages sent":
            self = .messagesLimitExceeded
        case "New payment can not be initiated by premium user":
            self = .paymentByPremiumUser
        case "First name must be between 2 and 50 characters long":
            self = .invalidFirstName
        case "Last name must be between 2 and 50 characters long":
            self = .invalidLastName
        default:
            self = .general(firstErrorDict)
        }
    }
}

extension Notification.Name {
    static let userBecameUnauthorized = Notification.Name("userBecameUnauthorized")
}

struct ServerResponse<T: Codable>: Codable {
    var data: ServerData<T>
}

struct ServerData<T: Codable>: Codable {
    var attributes: T
}

class ServerConnection: BaseServerConnection, AuthServiceInjected {
    let sendToken: Bool
	init(
        endpoint: String,
        baseUrl: String = Server.baseURL + "/\(UserDefaults.countryCode ?? "main")",
        httpMethod: HTTPMethod = .GET,
        headers: [String: String?] = [:],
        queryDictionary: [String: Any] = [:],
        body: Any? = nil,
        sendToken: Bool = true,
        resultOnMainThread: Bool = true
    ) {
        self.sendToken = sendToken
        super.init(baseUrl: baseUrl)
        self.endpoint = endpoint
        self.httpMethod = httpMethod
        self.headers = headers
        self.queryDictionary = queryDictionary
        self.body = body
        self.resultOnMainThread = resultOnMainThread

        if let token = authService.token, sendToken {
            self.headers["Authorization"] = "Bearer \(token)"
        }
        self.headers["Accept"] = "application/vnd.api+json"
        let currentVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] ?? ""
        self.headers["User-Agent"] = "iOS app \(currentVersion)"
	}

    func execute(completion: @escaping ServerRequestCompletion<JsonApiObject>) {
#if DEBUG || UAT
        let delay = UserDefaults.requestDelay
        guard delay > 0 else {
            performExecute(completion: completion)
            return
        }
        Logger.log("Pausing request execution for \(delay) seconds.")
        if Thread.current.isMainThread {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                Logger.log("Continue request execution after \(delay) seconds pause.")
                self.performExecute(completion: completion)
            }
            return
        } else {
            usleep(UInt32(1_000_000 * delay))
            Logger.log("Continue request execution after \(delay) seconds pause.")
            performExecute(completion: completion)
        }
#else
        performExecute(completion: completion)
#endif
    }

    private func performExecute(completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        super.beginRequest { responseObj, httpResponse in
            switch responseObj {
            case .success(let object):
                completion(.success(JsonApiObject(object)))
            case .failure(let error):
                completion(.failure(error))
            }

            if httpResponse?.statusCode == 401 {
                NotificationCenter.default.post(name: .userBecameUnauthorized, object: nil)
            }
        }
    }

    func executeAndParse<T: Codable>(completion: @escaping ServerRequestCompletion<ServerResponse<T>>) {
        responseDataType = .binary

        super.beginRequest { responseObj, httpResponse in
            switch responseObj {
            case .success(let object):
                guard let data = object as? Data else {
                    completion(.failure(.dataParsing(.general)))
                    return
                }

                do {
                    let jsonData = try JSONDecoder().decode(ServerResponse<T>.self, from: data)
                    completion(.success(jsonData))
                } catch {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }

            if httpResponse?.statusCode == 401 {
                NotificationCenter.default.post(name: .userBecameUnauthorized, object: nil)
            }
        }
    }
}
