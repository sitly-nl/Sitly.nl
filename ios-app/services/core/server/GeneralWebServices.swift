import Foundation
import CoreLocation.CLLocation
import Sentry

enum ReportType {
    case general(String)
    case avatar
}

protocol GeneralWebServicesProtocol {
    func reversGeocode(coordinate: CLLocationCoordinate2D, completion: @escaping ServerRequestCompletion<Address>)
    func provinceAutocomplete(query: String, completion: @escaping ServerRequestCompletion<[String]>)
    func cityAutocomplete(query: String, province: String?, completion: @escaping ServerRequestCompletion<[String]>)
    func streetAutocomplete(cityName: String, query: String, completion: @escaping ServerRequestCompletion<[String]>)
    func streetForPostcode(_ postcode: String, completion: @escaping ServerRequestCompletion<AddressInput>)
    func postFeedback(description: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func getConfig(completion: @escaping ServerRequestCompletion<Configuration>)
    func getDeepLinkRegExps(completion: @escaping ServerRequestCompletion<[DeepLinkType: [NSRegularExpression]]>)
    func reportUser(id: String, type: ReportType, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func askRecommendation(content: String, userId: String, completion: @escaping ServerRequestCompletion<Message>)
}

extension ServerManager: GeneralWebServicesProtocol {
    func reversGeocode(coordinate: CLLocationCoordinate2D, completion: @escaping ServerRequestCompletion<Address>) {
        ServerConnection(
            endpoint: "address-components",
            queryDictionary: [
                "filter": [
                    "latitude": coordinate.latitude,
                    "longitude": coordinate.longitude
                ]
            ]
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                if let address: Address = jsonObj.single() {
                    completion(.success(address))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

// MARK: - Autocomplete
    func provinceAutocomplete(query: String, completion: @escaping ServerRequestCompletion<[String]>) {
        ServerConnection(
            endpoint: "address-components/provinces",
            queryDictionary: ["filter[keyword]": query]
        ).execute {
            completion(self.parseAutocomplete(response: $0))
        }
    }

    func cityAutocomplete(query: String, province: String?, completion: @escaping ServerRequestCompletion<[String]>) {
        if query.isEmpty {
            completion(.success([]))
            return
        }

        var queryDict = ["filter[keyword]": query]
        if let province = province, !province.isEmpty {
            queryDict["filter[province]"] = province
        }

        ServerConnection(
            endpoint: "address-components/places",
            queryDictionary: queryDict
        ).execute {
            completion(self.parseAutocomplete(response: $0))
        }
    }

    func streetAutocomplete(cityName: String, query: String, completion: @escaping ServerRequestCompletion<[String]>) {
        if cityName.isEmpty || query.isEmpty {
            completion(.success([]))
            return
        }

        let serverConnection = ServerConnection(endpoint: "address-components/streets")
        serverConnection.queryDictionary = ["filter[place]": cityName,
                                            "filter[keyword]": query]
        serverConnection.execute {
            completion(self.parseAutocomplete(response: $0))
        }
    }

    func streetForPostcode(_ postcode: String, completion: @escaping ServerRequestCompletion<AddressInput>) {
        let serverConnection = ServerConnection(endpoint: "address-components/streets")
        serverConnection.queryDictionary = ["filter[postal-code]": postcode]
        serverConnection.execute {
            switch $0 {
            case .success(let jsonObj):
                var addressInput: AddressInput?
                if let data = jsonObj.data as? [String: Any] {
                    if let attributes = data["attributes"] as? [String: Any], let place = attributes["placeName"] as? String {
                        addressInput = .brazil(BrazilAddressInputModel(
                            city: place,
                            postalCode: postcode,
                            street: attributes["name"] as? String,
                            houseNumber: nil
                        ))
                    }
                } else if let data = jsonObj.data as? [[String: Any]] {
                    if  data.count > 0,
                        let attributes = data[0]["attributes"] as? [String: Any],
                        let province = attributes["province"] as? String,
                        let place = attributes["placeName"] as? String {
                            addressInput = .malaysia(MalaysiaAddressInputModel(
                                province: province, city: place, postalCode: postcode, line1: nil, line2: nil
                            ))
                    }
                }

                if let addressInput {
                    completion(.success(addressInput))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    private func parseAutocomplete(response: Result<JsonApiObject, ServerBaseError>) -> Result<[String], ServerBaseError> {
        switch response {
        case .success(let jsonObj):
            guard
                let names = (jsonObj.data as? [[String: Any]])?
                    .compactMap({ $0["attributes"] as? [String: Any] })
                    .compactMap({ $0["name"] as? String })
                else {
                    return .failure(.dataParsing(.general))
            }
            return .success(names)
        case .failure(let error):
            return .failure(error)
        }
    }

// MARK: -
    func postFeedback(description: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        let serverConnection = ServerConnection(endpoint: "feedbacks")
        serverConnection.httpMethod = .POST
        serverConnection.body = ["description": description,
                                 "category": "General"]
        serverConnection.execute(completion: completion)
    }

    func getConfig(completion: @escaping ServerRequestCompletion<Configuration>) {
        ServerConnection(endpoint: "country-settings").execute {
            switch $0 {
            case .success(let jsonObj):
                if let config = try? Configuration(jsonObject: jsonObj) {
                    completion(.success(config))
                } else {
                    SentrySDK.capture(error: NSError(domain: "country-settings.parsing.error", code: 0))
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func getDeepLinkRegExps(completion: @escaping ServerRequestCompletion<[DeepLinkType: [NSRegularExpression]]>) {
        ServerConnection(
            endpoint: "deeplinks", baseUrl: Server.baseURL + "/main",
            queryDictionary: ["deviceType": "ios"]
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                var deepLinkRegExps = [DeepLinkType: [NSRegularExpression]]()

                (jsonObj.object as? [String: [String]])?.forEach { (key, value) in
                    guard let type = DeepLinkType(rawValue: key) else {
                        return
                    }
                    deepLinkRegExps[type] = value.compactMap { try? NSRegularExpression(pattern: $0) }
                }

                completion(.success(deepLinkRegExps))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func reportUser(id: String, type: ReportType, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        var body = ["reportedUserId": id]
        switch type {
        case .general(let reason):
            body["reason"] = reason
        case .avatar:
            body["type"] = "avatar"
        }

        ServerConnection(endpoint: "reports", httpMethod: .POST, body: body).execute(completion: completion)
    }

    class func instagramToken(code: String, redirectURI: String, completion: @escaping ServerRequestCompletion<InstagramToken>) {
        ServerConnection(
            endpoint: "instagram-tokens",
            httpMethod: .POST,
            body: [
                "code": code,
                "redirectUri": redirectURI
            ]
        ).executeAndParse(completion: { (res: Result<ServerResponse<InstagramToken>, ServerBaseError>) in
            switch res {
            case .success(let jsonObj):
                completion(.success(jsonObj.data.attributes))
            case .failure(let error):
                completion(.failure(error))
            }
        })
    }

    func askRecommendation(content: String, userId: String, completion: @escaping ServerRequestCompletion<Message>) {
        ServerConnection(
            endpoint: "recommendations/\(userId)/requests",
            httpMethod: .POST,
            body: ["content": content]
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                if let message: Message = jsonObj.single() {
                    completion(.success(message))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
}
