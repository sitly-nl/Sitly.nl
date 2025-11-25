import Foundation

class ContinuousDataLoader {
    typealias LoadingBlock = (_ input: String, _ completion: @escaping () -> Void) -> Void

    private var lastQuery: String?
    private var loading = false
    private let loadingBlock: LoadingBlock

    init(loadingBlock: @escaping LoadingBlock) {
        self.loadingBlock = loadingBlock
    }

    func query(_ query: String) {
        if lastQuery != query {
            lastQuery = query
            perform(query: query)
        }
    }

    private func perform(query: String) {
        if loading {
            return
        }

        loading = true
        loadingBlock(query) {
            self.loading = false
            if query != self.lastQuery, let lastQuery = self.lastQuery {
                self.perform(query: lastQuery)
            }
        }
    }
}
