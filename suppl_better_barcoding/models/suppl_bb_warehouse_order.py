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

from odoo import api, fields, SUPERUSER_ID, http, models, _


class SupplProductProduct(models.Model):
    _name = 'product.product'
    _inherit = 'product.product'

    pickingProducts = fields.One2many('stock.warehouse.product.handle', 'product_id')


class SupplStockMove(models.Model):
    _name = 'stock.move'
    _inherit = 'stock.move'

    def get_current_warehouse(self):
        sorted = self.sorted(lambda x: x.get_sort_order())
        return sorted

    def get_sort_order(self):
        pickingOrder = self.env['stock.warehouse.product.handle'].search([
            ('product_id', '=', self.product_id.id),
            ('warehouse_id', '=',  self.warehouse_id.id)
        ], limit=1)

        if len(pickingOrder) > 0:
            return pickingOrder.sequence
        else:
            return 9999


class SupplWarehouseProduct(models.Model):
    _name = "stock.warehouse.product.handle"
    _description = "stock.warehouse.product.handle"
    _order = "sequence"

    product_id = fields.Many2one('product.product', required=True)
    warehouse_id = fields.Many2one('stock.warehouse', required=True)
    sequence = fields.Integer('sequence', default=10)


class SupplWarehouse(models.Model):
    _name = 'stock.warehouse'
    _inherit = 'stock.warehouse'

    pickingProducts = fields.One2many('stock.warehouse.product.handle', 'warehouse_id')