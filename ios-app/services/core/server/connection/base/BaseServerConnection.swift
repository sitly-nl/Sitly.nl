import Foundation
import SystemConfiguration

enum DataType {
	case binary
	case string
	case json
}

enum HTTPMethod: String {
	case GET
	case POST
	case DELETE
	case PUT
	case PATCH

	var hasBody: Bool {
		return self == .POST || self == .PUT || self == .PATCH
	}
}

enum ServerBaseError: LocalizedError {
    case invalidRequest
    case networkConnection(Error?)
    case dataParsing(ParsingError)
    case client(ClientError)
    case server

    var errorDescription: String? {
        switch self {
        case .networkConnection(let error):
            return "noInternetConnection".localized + ": \(error?.localizedDescription ?? "")"
        case .client(let clientError):
            return clientError.errorDescription
        case .server:
            return "error.server".localized
        case .invalidRequest:
            return "somethingWentWrong".localized
        case .dataParsing(let error):
            return error.localizedDescription
        }
    }

    init?(statusCode: NSInteger, data: Any?) {
        if statusCode >= 500 {
            self = .server
        } else if statusCode >= 400 {
            self = .client(ClientError(data: data))
        } else {
            return nil
        }
    }
}

func serverLog<T>(_ value: T, functionName: String = #function) {
	let enabledLog = true
	if enabledLog {
		if let value = value as? String, value.count > 2800 {
			debugLog("\(value[..<value.index(value.startIndex, offsetBy: 2799)]) .....", functionName: functionName)
		} else {
			debugLog(value, functionName: functionName)
		}
	}
}

class BaseServerConnection {
	var baseUrl: String
	var endpoint: String?

	var body: Any?
	var queryDictionary = [String: Any]()
	var headers = [String: String?]()

	var httpMethod = HTTPMethod.GET
	var requestDataType = DataType.json
	var responseDataType = DataType.json
	var contentType: String?
    var resultOnMainThread: Bool = true

// MARK: - Builders
	var url: URL? {
		guard let components = NSURLComponents(string: baseUrl) else { return nil }
		components.queryItems = queryDictionary.flatMap { queryComponents(fromKey: $0, value: $1) }
		if let endpoint = endpoint, let path = components.path, !endpoint.isEmpty {
			components.path = path + "/" + endpoint
		}

        var string = components.string
        if string?.suffix(1) == "?" {
            string?.removeLast()
        }

        return string.flatMap { URL(string: $0) }
	}

	var request: URLRequest? {
		guard let url = url else {
			return nil
		}

        var request = URLRequest(url: url)

		request.httpMethod = httpMethod.rawValue
		request.httpBody   = httpBody()

		request.setValue(contentTypeValue(), forHTTPHeaderField: "Content-Type")
		headers.forEach { request.setValue($1, forHTTPHeaderField: $0) }

		return request
	}

// MARK: - Init
	init(baseUrl: String) {
		self.baseUrl = baseUrl
	}

// MARK: - External api
    func beginRequest(
        session: URLSession = URLSession.shared,
        completion: @escaping (_ response: Result<Any, ServerBaseError>, _ httpResponse: HTTPURLResponse?) -> Void
    ) {
		guard let request = request else {
			completion(.failure(.invalidRequest), nil)
			return
		}

		// Check internet connection
		if !Reachability.isOnline {
			completion(.failure(.networkConnection(NSError(domain: "network.notReachable", code: 0))), nil)
			return
		}

        if httpMethod.hasBody {
            serverLog(
                """
                ➡️ \(httpMethod) \(url?.absoluteString ?? "-")
                [body] = \( (body.flatMap { try? JSONSerialization.data(withJSONObject: $0) }.flatMap { String(data: $0, encoding: .utf8) } ?? body) ?? "<Empty data>")
                """
            )
        } else {
            serverLog("➡️ \(httpMethod) \(url?.absoluteString ?? "-")")
        }

		// Begin task
		let dataTask = session.dataTask(with: request) { (data: Data?, response: URLResponse?, error: Error?) -> Void in
			func callCompletion(_ response: Result<Any, ServerBaseError>, _ httpResponse: HTTPURLResponse?) {
                if self.resultOnMainThread {
                    DispatchQueue.main.async {
                        completion(response, httpResponse)
                    }
                } else {
                    completion(response, httpResponse)
                }
			}

			let httpResponse = response as? HTTPURLResponse
            httpResponse.flatMap { serverLog("⬅️ \($0.statusCode) \(self.httpMethod) \(self.url?.absoluteString ?? "-")") }

			if let error {
				serverLog("‼️⬅️ [Connection error] \(error)")
				callCompletion(.failure(.networkConnection(error)), httpResponse)
			} else if let serverError = httpResponse.flatMap({ ServerBaseError(statusCode: $0.statusCode, data: self.parseData(data)) }) {
				serverLog("‼️⬅️ [error]\ndata=\(self.parseData(data) ?? "<Empty data>")")
				callCompletion(.failure(serverError), httpResponse)
			} else {
				if let data {
					if let parsedResponse = self.parseData(data) {
						callCompletion(.success(parsedResponse), httpResponse)
					} else {
						callCompletion(.failure(.dataParsing(.general)), httpResponse)
						serverLog("‼️⬅️ Response data can't be parsed=\(String(data: data, encoding: .utf8) ?? "<Empty data>")")
					}
				} else {
					callCompletion(.failure(.networkConnection(nil)), httpResponse)
				}
			}
		}
		dataTask.resume()
	}
}

// helper
private extension BaseServerConnection {
    func queryComponents(fromKey key: String, value: Any) -> [URLQueryItem] {
        var components = [URLQueryItem]()

        if let dictionary = value as? [String: Any] {
            for (nestedKey, value) in dictionary {
                components.append(contentsOf: queryComponents(fromKey: "\(key)[\(nestedKey)]", value: value))
            }
        } else if let array = value as? [Any] {
            array.forEach {
                components.append(contentsOf: queryComponents(fromKey: "\(key)[]", value: $0))
            }
        } else if let bool = value as? Bool {
            components.append(URLQueryItem(name: key, value: (bool ? "1" : "0")))
        } else {
            components.append(URLQueryItem(name: key, value: "\(value)"))
        }

        return components
    }

	func httpBody() -> Data? {
		if httpMethod.hasBody, let body = body {
			if requestDataType == .json {
                return try? JSONSerialization.data(withJSONObject: body, options: JSONSerialization.WritingOptions.withoutEscapingSlashes)
			} else {
				if let body = self.body as? Data {
					return body
				} else if let body = self.body as? String {
					return body.data(using: .utf8)
				}
			}
		}
		return nil
	}

	func contentTypeValue() -> String? {
		if contentType?.isEmpty ?? true && requestDataType == .json {
            return "application/json"
		}
		return contentType
	}

	func parseData(_ data: Data?) -> Any? {
		if let data = data, data.count > 0 {
			if self.responseDataType == .json {
				return try? JSONSerialization.jsonObject(with: data, options: .allowFragments)
			} else if self.responseDataType == .string {
				return String(data: data, encoding: .utf8)
			}
		}
		return data
	}
}
