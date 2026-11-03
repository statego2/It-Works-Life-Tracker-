import UIKit
import Capacitor

/// Registers the in-app widget bridge. Capacitor's stock controller does not
/// see Swift files that live only in this target.
class ItWorksViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
