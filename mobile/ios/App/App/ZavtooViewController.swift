import UIKit
import Capacitor

/// One iOS project builds three apps (customer, partner, dealer). Each build
/// sets ZavtooStartURL in Info.plist, and the web view opens that page of
/// zavtoo.in instead of the default in capacitor.config.json.
class ZavtooViewController: CAPBridgeViewController {
    override func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
        if let url = Bundle.main.object(forInfoDictionaryKey: "ZavtooStartURL") as? String, !url.isEmpty {
            descriptor.serverURL = url
        }
        return descriptor
    }
}
