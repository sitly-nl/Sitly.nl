import Foundation
import RealmSwift

extension Realm {
    ///  Removes all data from the Realm.
    func clear() {
        write {
            deleteAll()
        }
    }

    /// Opens a write transaction and commits it to the Realm.
    ///
    /// - Parameter closure: The closure to executed during the transaction.
    func write(_ closure: () -> Void) {
        // Start write transaction
        self.beginWrite()

        // Run custom code
        closure()

        // Save changes
        do {
            try self.commitWrite()
        } catch {
            print("Realm couldn't write the data.")
        }
    }
}
