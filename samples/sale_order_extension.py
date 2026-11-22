# -*- coding: utf-8 -*-
# Sample file to try Odoo Color Theme (Odoo Python model).
from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

MAX_DISCOUNT = 30.0


class SaleOrder(models.Model):
    _inherit = 'sale.order'
    _description = "Sales Order (extended)"
    _order = 'date_order desc, id desc'

    delivery_note = fields.Text(string="Delivery Note", translate=True)
    priority_level = fields.Selection(
        selection=[('0', 'Normal'), ('1', 'Urgent')],
        default='0',
        tracking=True,
    )
    margin_percent = fields.Float(compute='_compute_margin_percent', store=True, digits=(16, 2))
    carrier_partner_id = fields.Many2one('res.partner', ondelete='set null', index=True)
    tag_ids = fields.Many2many('crm.tag', string="Tags")

    @api.depends('order_line.price_subtotal', 'order_line.purchase_price')
    def _compute_margin_percent(self):
        for order in self:
            cost = sum(order.order_line.mapped('purchase_price'))
            order.margin_percent = (order.amount_untaxed - cost) / cost * 100 if cost else 0.0

    @api.onchange('partner_id')
    def _onchange_partner_id_priority(self):
        if self.partner_id and self.partner_id.is_company:
            self.priority_level = '1'

    @api.constrains('margin_percent')
    def _check_margin_percent(self):
        for order in self.filtered(lambda o: o.margin_percent > MAX_DISCOUNT):
            raise ValidationError(_("Margin %(margin)s%% is too high", margin=order.margin_percent))

    @api.model
    def _get_default_note(cls):
        return f"Created on {fields.Date.today()}"

    def action_confirm(self):
        res = super().action_confirm()
        self.write({'tag_ids': [fields.Command.link(1)]})
        return res


class SaleOrderPriorityWizard(models.TransientModel):
    _name = 'sale.order.priority.wizard'
    _description = "Set priority on orders"

    order_ids = fields.Many2many('sale.order')
    is_urgent = fields.Boolean(default=False)

    def action_apply(self):
        self.order_ids.write({'priority_level': '1' if self.is_urgent else '0'})
        return {'type': 'ir.actions.act_window_close'}
