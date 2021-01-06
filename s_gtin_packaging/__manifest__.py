# -*- coding: utf-8 -*-

{
    'name': 'Scopea GTIN packaging',
    'summary': 'Print GTIN packaging',
    'description': """
    Generate GS1 barcodes for packaging.
""",
    'author': 'Scopea',
    'website': 'scopea;fr',
    'category': 'Tools',
    'version': '13.01',
    'installable': True,
    'application': False,
    'auto_install': False,
    'depends': ['product', 'suppl_svg_barcodes','suppl_delivery_gs1_labels'],
    'data': [
        'views/template.xml'
    ],
}