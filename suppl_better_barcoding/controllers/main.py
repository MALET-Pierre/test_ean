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

from odoo import http, _
from odoo.http import request


class SupplBetterBarcodingController(http.Controller):

    @http.route('/suppl_better_barcoding/get_qty_for_lot', type='json', auth='user')
    def get_qty_for_lot(self, lot_name, location_id):
        return sum(request.env['stock.quant'].search(
            [('lot_id.name', '=', lot_name),
             ('location_id.id', '=', location_id)]).mapped('quantity'))
