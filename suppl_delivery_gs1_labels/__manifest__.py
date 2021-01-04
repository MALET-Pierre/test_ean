# -*- coding: utf-8 -*-

###################################################################################
#
#    Copyright (c) SUPPLiot GmbH.
#
#    This file is part of SUPPLiot GS1 SSCC Labels module
#    (see https://suppliot.eu).
#
#    See LICENSE file for full copyright and licensing details.
#
###################################################################################

{
    'name': 'SUPPLiot GS1 SSCC Labels',
    'summary': 'Print GS1 SSCC labels for packages.',
    'description': """
* Generate GS1 barcodes for products.
* Generate GS1 SSCC numbers for packages.
* Generate valid GS1 labels for packages or pickings with packages.

=========================================================================================

Support
-----------------------------------------------------------------------------------------
Email: support@suppliot.eu


Keywords
-----------------------------------------------------------------------------------------
Packaging, Picking, GS1, SSCC, Barcodes

""",
    'author': 'SUPPLiot GmbH',
    'contributors': ['SUPPLiot GmbH'],
    'website': '',
    'category': 'Tools',
    'version': '0.7',
    'installable': True,
    'application': False,
    'auto_install': False,
    'depends': ['stock', 'suppl_svg_barcodes'],
    'data': [
        'security/ir.model.access.csv',
        #
        'report/delivery_gs1_label_compact.xml',
        'report/delivery_gs1_report_actions.xml',
        #
        'data/delivery_gs1_sscc_sequence.xml',
        #
        'views/template.xml',
        'views/stock_quant_views.xml'
    ],
    'license': 'OPL-1',
    'support': 'support@suppliot.eu'
}