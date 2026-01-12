#!/usr/bin/env python3
"""
Script de génération de planning de rotation des responsabilités
Crée un fichier Excel avec rotation automatique pour Réception, Présidence et Secrétariat
"""

import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
import sys
import json


def get_next_person(ordre, position, exclusions):
    """
    Obtenir la prochaine personne qui n'est pas dans les exclusions
    
    Args:
        ordre (list): Liste ordonnée des membres pour un rôle
        position (int): Index actuel dans l'ordre
        exclusions (set): Set des personnes déjà assignées ce mois
    
    Returns:
        tuple: (personne sélectionnée, nouvelle position)
    """
    for i in range(len(ordre)):
        candidate = ordre[(position + i) % len(ordre)]
        if candidate not in exclusions:
            return candidate, (position + i + 1) % len(ordre)
    return None, position


def trouver_prochaine_ligne(ws):
    """Trouver la prochaine ligne vide pour ajouter une année"""
    max_row = ws.max_row
    # Chercher la première ligne vide après la ligne 3
    for row in range(4, max_row + 2):
        if ws[f'A{row}'].value is None:
            return row
    return max_row + 1


def creer_rotation_responsabilites(
    annee, 
    fichier_entree=None,
    membres_actuels=None,
    nouveaux_membres=None,
    ordre_reception=None,
    ordre_presidence=None,
    ordre_secretariat=None,
    positions_initiales=None
):
    """
    Créer ou mettre à jour un planning de rotation
    
    Args:
        annee (int): Année du planning (ex: 2026)
        fichier_entree (str): Chemin du fichier Excel existant (optionnel)
        membres_actuels (dict): Dict des membres avec leurs couleurs
        nouveaux_membres (list): Liste des nouveaux membres à intégrer
        ordre_reception (list): Ordre personnalisé pour la réception
        ordre_presidence (list): Ordre personnalisé pour la présidence
        ordre_secretariat (list): Ordre personnalisé pour le secrétariat
        positions_initiales (dict): Positions de départ pour chaque rôle
    
    Returns:
        str: Chemin du fichier Excel généré
    """
    
    # Définir les couleurs par défaut
    couleurs_defaut = {
        'Julio Ngueno': 'FF64B5F6',
        'Armel Djiongo': 'FFEF5350',
        'Franc Lekeuka': 'FF66BB6A',
        'Martin Kana': 'FFAB47BC',
        'Jean De Dieu Dongmo': 'FFFF7043',
        'Joël Sobgoum': 'FF757575',
        'En ligne': 'FF8D6E63',
        'Chamberlin Momo': 'FF26C6DA',
        'Romuald Djoumetio': 'FFEC407A',
        'Jean-Bosco Nguezet': 'FF424242',
    }
    
    # Palette pour nouveaux membres
    nouvelles_couleurs = [
        'FFFFA726', 'FF9CCC65', 'FF26A69A', 'FF5C6BC0',
        'FFFF7043', 'FF7CB342', 'FF78909C', 'FFFFCA28'
    ]
    
    # Fusionner les couleurs
    couleurs = couleurs_defaut.copy()
    if membres_actuels:
        couleurs.update(membres_actuels)
    
    # Assigner couleurs aux nouveaux membres
    if nouveaux_membres:
        for i, nouveau in enumerate(nouveaux_membres):
            if nouveau not in couleurs:
                couleurs[nouveau] = nouvelles_couleurs[i % len(nouvelles_couleurs)]
    
    # Charger ou créer le workbook
    if fichier_entree:
        wb = openpyxl.load_workbook(fichier_entree)
        ws = wb.active
    else:
        wb = openpyxl.Workbook()
        ws = wb.active
        # Créer l'en-tête si nouveau fichier
        ws['A3'] = 'Année'
        ws['B3'] = 'Réception'
        ws['C3'] = 'Présidence'
        ws['D3'] = 'Secrétariat'
        ws['E3'] = 'Exposé'
        
        # Formater l'en-tête
        for col in ['A', 'B', 'C', 'D', 'E']:
            cell = ws[f'{col}3']
            cell.font = Font(name='Calibri', size=14, bold=True, color='FF000000')
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )
    
    # Extraire les ordres de rotation existants ou utiliser par défaut
    if ordre_reception is None:
        ordre_reception = [m for m in couleurs.keys() if m != 'En ligne']
    if ordre_presidence is None:
        ordre_presidence = [m for m in couleurs.keys() if m != 'En ligne']
    if ordre_secretariat is None:
        ordre_secretariat = [m for m in couleurs.keys() if m != 'En ligne']
    
    # Positions initiales
    if positions_initiales is None:
        positions_initiales = {'reception': 0, 'presidence': 0, 'secretariat': 0}
    
    # Algorithme de génération du planning
    mois_annee = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    
    planning = {}
    pos_reception = positions_initiales.get('reception', 0)
    pos_presidence = positions_initiales.get('presidence', 0)
    pos_secretariat = positions_initiales.get('secretariat', 0)
    
    for mois in mois_annee:
        if mois in ['Juillet', 'Décembre']:
            reception = 'En ligne'
            exclusions = set()
        else:
            reception = ordre_reception[pos_reception % len(ordre_reception)]
            pos_reception += 1
            exclusions = {reception}
        
        # Présidence (éviter conflit avec réception)
        presidence, pos_presidence = get_next_person(
            ordre_presidence, pos_presidence, exclusions
        )
        exclusions.add(presidence)
        
        # Secrétariat (éviter conflits avec réception et présidence)
        secretariat, pos_secretariat = get_next_person(
            ordre_secretariat, pos_secretariat, exclusions
        )
        
        planning[mois] = {
            'Reception': reception,
            'Présidence': presidence,
            'Secrétariat': secretariat
        }
    
    # Écrire dans Excel
    start_row = trouver_prochaine_ligne(ws)
    
    # En-tête année
    ws[f'A{start_row}'] = annee
    ws[f'A{start_row}'].font = Font(name='Calibri', size=14, bold=True, color='FF000000')
    ws[f'A{start_row}'].alignment = Alignment(horizontal='center', vertical='center')
    ws.merge_cells(f'A{start_row}:E{start_row}')
    ws[f'A{start_row}'].border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Données mensuelles
    current_row = start_row + 1
    for mois in mois_annee:
        data = planning[mois]
        
        # Mois (Bold)
        ws[f'A{current_row}'] = mois
        ws[f'A{current_row}'].font = Font(name='Calibri', size=14, bold=True, color='FF000000')
        
        # Réception avec couleur
        ws[f'B{current_row}'] = data['Reception']
        if data['Reception'] in couleurs:
            ws[f'B{current_row}'].fill = PatternFill(
                start_color=couleurs[data['Reception']], 
                end_color=couleurs[data['Reception']], 
                fill_type="solid"
            )
        ws[f'B{current_row}'].font = Font(name='Calibri', size=14, color='FF000000')
        
        # Présidence avec couleur
        ws[f'C{current_row}'] = data['Présidence']
        if data['Présidence'] in couleurs:
            ws[f'C{current_row}'].fill = PatternFill(
                start_color=couleurs[data['Présidence']], 
                end_color=couleurs[data['Présidence']], 
                fill_type="solid"
            )
        ws[f'C{current_row}'].font = Font(name='Calibri', size=14, color='FF000000')
        
        # Secrétariat avec couleur
        ws[f'D{current_row}'] = data['Secrétariat']
        if data['Secrétariat'] in couleurs:
            ws[f'D{current_row}'].fill = PatternFill(
                start_color=couleurs[data['Secrétariat']], 
                end_color=couleurs[data['Secrétariat']], 
                fill_type="solid"
            )
        ws[f'D{current_row}'].font = Font(name='Calibri', size=14, color='FF000000')
        
        # Exposé (vide)
        ws[f'E{current_row}'] = ''
        
        # Appliquer alignement et bordures à toutes les cellules
        for col in ['A', 'B', 'C', 'D', 'E']:
            ws[f'{col}{current_row}'].alignment = Alignment(
                horizontal='center', 
                vertical='center', 
                wrap_text=True
            )
            ws[f'{col}{current_row}'].border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )
        
        current_row += 1
    
    # Ajuster les largeurs de colonnes
    ws.column_dimensions['A'].width = 12
    ws.column_dimensions['B'].width = 20
    ws.column_dimensions['C'].width = 20
    ws.column_dimensions['D'].width = 20
    ws.column_dimensions['E'].width = 20
    
    # Sauvegarder
    output_path = f'/mnt/user-data/outputs/Rotation_responsabilites_{annee}.xlsx'
    wb.save(output_path)
    
    return output_path, planning, couleurs


if __name__ == '__main__':
    # Exemple d'utilisation en ligne de commande
    if len(sys.argv) < 2:
        print("Usage: python generer_rotation.py <annee> [fichier_entree.xlsx] [config.json]")
        sys.exit(1)
    
    annee = int(sys.argv[1])
    fichier_entree = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Charger config si fournie
    config = {}
    if len(sys.argv) > 3:
        with open(sys.argv[3], 'r', encoding='utf-8') as f:
            config = json.load(f)
    
    output_path, planning, couleurs = creer_rotation_responsabilites(
        annee=annee,
        fichier_entree=fichier_entree,
        **config
    )
    
    print(f"✅ Planning généré avec succès : {output_path}")
    print(f"\n📅 Aperçu de la rotation {annee}:")
    for mois, roles in planning.items():
        print(f"{mois:12} | Réception: {roles['Reception']:20} | Présidence: {roles['Présidence']:20} | Secrétariat: {roles['Secrétariat']}")
