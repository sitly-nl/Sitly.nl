import Foundation

class SearchService: SearchServiceable, ServerServiceInjected {
    var userService: UserServiceable = UserService()
    var configService: ConfigServiceable = ConfigService()

    func getRestoredSearchForm() -> SearchForm {
        var form = getDefaultSearchForm()
        form.restored().flatMap { form = $0 }
        return form
    }

    func resetSearchForm(searchForm: SearchForm) -> SearchForm {
        let form = getDefaultSearchForm()
        form.role = searchForm.role
        form.searchType = searchForm.searchType
        return form
    }

    private func getDefaultSearchForm() -> SearchForm {
        return SearchForm(user: userService.fetchMe() ?? User(), config: configService.fetch() ?? Configuration())
    }

    func numberOfActiveFilters(searchForm: SearchForm) -> Int {
        guard let user = userService.fetchMe(), let config = configService.fetch() else {
            return 0
        }

        return searchForm.nrOfActiveFilters(user: user, config: config)
    }

    func search(searchForm: SearchForm, completion: @escaping ServerRequestCompletion<SearchResult>) {
        serverManager.searchUsers(searchForm) { response in
            switch response {
            case .success(let (entities, total)):
                var count = total
                var entities = entities
                var totalHidden = 0

                if case .users(var users) = entities {
                    // Filter hidden users
                    let hiddenUsers = self.userService.fetchHiddenUsers()
                    totalHidden = hiddenUsers.count
                    hiddenUsers.forEach { hiddenUser in
                        if let index = users.firstIndex(where: { $0.id.equalsIgnoreCase(hiddenUser.id) }) {
                            users[index].isHidden = true
                            users.remove(at: index)
                            count -= 1
                        }
                    }

                    if let visitedUsers = self.userService.fetchVisitedUsers() {
                        visitedUsers.forEach { visitedUser in
                            users.first(where: {
                                $0.id.equalsIgnoreCase(visitedUser.id)
                            })?.hasVisitedPin = true
                        }
                    }

                    entities = .users(users)
                }
                completion(.success(SearchResult(entities: entities, total: count, totalHidden: totalHidden)))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
}
