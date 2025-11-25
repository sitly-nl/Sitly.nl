import Foundation

protocol JobPostingWebServicesProtocol {
    func getJobPosting(id: Int, completion: @escaping ServerRequestCompletion<JobPosting>)
    func postJob(_ form: JobPostingForm, completion: @escaping ServerRequestCompletion<JobPosting>)
    func completeJobPosting(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func continueJobPosting(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func markAsAvailableJobPosting(id: String, completion: @escaping ServerRequestCompletion<Message>)
    func removeInvitation(jobPostingId: String, receiverId: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func rejectFoster(jobPostingId: String, receiverId: String, completion: @escaping ServerRequestCompletion<Message>)
}

extension ServerManager: JobPostingWebServicesProtocol {
    func getJobPosting(id: Int, completion: @escaping ServerRequestCompletion<JobPosting>) {
        ServerConnection(
            endpoint: "job-postings/\(id)"
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                if let jobPosting: JobPosting = jsonObj.single() {
                    completion(.success(jobPosting))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func postJob(_ form: JobPostingForm, completion: @escaping ServerRequestCompletion<JobPosting>) {
        ServerConnection(
            endpoint: "job-postings",
            httpMethod: .POST,
            body: form.serverDictionaryRepresentation
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                if let jobPosting: JobPosting = jsonObj.single() {
                    completion(.success(jobPosting))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func completeJobPosting(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "job-postings/\(id)/complete",
            httpMethod: .POST
        ).execute(completion: completion)
    }

    func continueJobPosting(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "job-postings/\(id)/continue",
            httpMethod: .POST
        ).execute(completion: completion)
    }

    func markAsAvailableJobPosting(id: String, completion: @escaping ServerRequestCompletion<Message>) {
        ServerConnection(
            endpoint: "job-postings/\(id)/available",
            httpMethod: .POST
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

    func removeInvitation(jobPostingId: String, receiverId: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "job-postings/\(jobPostingId)/remove-invitation/\(receiverId)",
            httpMethod: .POST
        ).execute(completion: completion)
    }

    func rejectFoster(jobPostingId: String, receiverId: String, completion: @escaping ServerRequestCompletion<Message>) {
        ServerConnection(
            endpoint: "job-postings/\(jobPostingId)/reject/\(receiverId)",
            httpMethod: .POST
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
