# -*- coding: utf-8 -*-

###################################################################################
#
#    Copyright (c) SUPPLiot GmbH.
#
#    This file is part of SUPPLiot Better Barcoding module
#    (see https://suppliot.eu).
#
#    See LICENSE file for full copyright and licensing details.
#
###################################################################################

from odoo import api, fields, models, SUPERUSER_ID, _
from datetime import timedelta, datetime


class SupplBetterInventoryLine(models.Model):
    _name = "stock.inventory.line"
    _inherit = "stock.inventory.line"

    use_date = fields.Datetime(string='Best before Date')

    @api.onchange('prod_lot_id', 'use_date')
    def _onchange_use_date(self):
        if not self.prod_lot_id:
            self.use_date = False
            return

        if not hasattr(self.prod_lot_id, 'use_date'):
            self.use_date = False
            return

        if not self.use_date:
            self.use_date = self.prod_lot_id.life_date = (self.prod_lot_id.life_date or datetime.now()).replace(hour=0, minute=0, second=0)

        self.prod_lot_id.life_date = self.use_date
        self.prod_lot_id.use_date = self.use_date
        self.prod_lot_id.removal_date = self.use_date
        self.prod_lot_id.alert_date = self.use_date - timedelta(days=14)
