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

{
    'name': 'SUPPLiot Better Barcoding',
    'summary': 'Extended Barcode App to improve barcode usability and minimize scan errors.',
    'description': """
This module extends barcode app view to improve barcode and stock picking usability.

* Greatly improve barcode view by combining multiple scanned lot- or serial numbers of the same product into a single 
line.
* Improved error messages for more feedback, quick edit functionality, add or remove scan entries. 
Correct errors more easily.
* Validate and print command: Automatically print pre-defined reports or labels immediately after picking operation 
is finished. 
* Configure your operation types to customize barcode view, set automatic packaging options and create user friendly 
instructions to print out.
* Configure automatic packaging for operation types: Put lines in separate packages per product, per variant or per 
charge.
* Creat and print step-by-step instructions for your employees and let them create quick transfers without the need 
of an PC.

======================================================================================================================

Support
-------
Email: support@suppliot.eu


Keywords
--------
Barcode, Odoo Barcode App, Operation Types
""",
    'author': 'SUPPLiot GmbH',
    'contributors': ['SUPPLiot GmbH'],
    'website': 'https://www.suppliot.eu',
    'category': 'Operations/Inventory',
    'version': '1.0',
    'installable': True,
    'application': False,
    'auto_install': False,
    'depends': ['stock_barcode'],
    'data': [
        'data/groups.xml',
        #
        'views/suppl_bb_stock_barcode_templates.xml',
        'views/suppl_bb_stock_picking_view_templates.xml',
        'views/suppl_bb_stock_inventory_templates.xml',
        'views/suppl_bb_stock_warehouse.xml',
        'views/suppl_bb_res_settings.xml',
        #
        'reports/suppl_bb_fancy_operation_type_code.xml',
        'reports/suppl_bb_report_actions.xml',
        'reports/suppl_bb_warehouse_order.xml',
        'reports/suppl_bb_picking_slip_extension.xml',
        #
        'security/ir.model.access.csv',
    ],
    'qweb': [
        'static/src/xml/suppl_bb_barcode_templates.xml'
    ],
    'images': ['static/description/main_screenshot.png'],
    'price': '110.00',
    'currency': 'EUR',
    'license': 'OPL-1',
    'support': 'support@suppliot.eu'
}
