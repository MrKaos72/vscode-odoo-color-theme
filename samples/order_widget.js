/** @odoo-module **/
// Sample file: OWL component.
import { Component, useState, xml } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

const REFRESH_DELAY = 5000;

export class OrderPriorityWidget extends Component {
    static template = xml`
        <div class="o_order_priority" t-on-click="toggle">
            <span t-if="state.urgent" class="text-danger">Urgent</span>
            <span t-else="">Normal</span>
        </div>`;
    static props = { record: Object, readonly: { type: Boolean, optional: true } };

    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.state = useState({ urgent: this.props.record.data.priority_level === "1" });
    }

    async toggle() {
        if (this.props.readonly) {
            return;
        }
        this.state.urgent = !this.state.urgent;
        await this.orm.write("sale.order", [this.props.record.resId], {
            priority_level: this.state.urgent ? "1" : "0",
        });
        this.notification.add(`Priority updated (${REFRESH_DELAY / 1000}s)`, { type: "success" });
    }
}

registry.category("fields").add("order_priority", { component: OrderPriorityWidget });
