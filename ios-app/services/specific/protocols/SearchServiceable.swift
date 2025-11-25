import Foundation

protocol SearchServiceable {
    func getRestoredSearchForm() -> SearchForm
    func resetSearchForm(searchForm: SearchForm) -> SearchForm
    func numberOfActiveFilters(searchForm: SearchForm) -> Int
    func search(searchForm: SearchForm, completion: @escaping ServerRequestCompletion<SearchResult>)
}
