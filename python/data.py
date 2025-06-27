# pip install nba_api pandas

from nba_api.stats.static import players, teams
from nba_api.stats.endpoints import PlayerGameLog, TeamGameLog
import pandas as pd
import time

def get_player_id(full_name):
    all_players = players.get_players()
    match = next((p for p in all_players if p['full_name'].lower() == full_name.lower()), None)
    if not match:
        raise ValueError(f"No player found with name {full_name}")
    return match['id']

def get_team_id(team_name):
    all_teams = teams.get_teams()
    match = next((t for t in all_teams if t['full_name'].lower() == team_name.lower()), None)
    if not match:
        raise ValueError(f"No team found with name {team_name}")
    return match['id']

def fetch_team_schedule(team_id, season='2024-25'):
    time.sleep(0.6)
    df = TeamGameLog(team_id=team_id, season=season).get_data_frames()[0]
    return df[['GAME_DATE', 'MATCHUP', 'WL']]

def fetch_player_stats(player_id, season='2024-25'):
    time.sleep(0.6)
    df = PlayerGameLog(player_id=player_id, season=season).get_data_frames()[0]
    return df[['GAME_DATE', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TOV',
               'FG_PCT', 'FG3_PCT', 'FT_PCT']]

def main():
    season      = '2024-25'
    player_name = 'LeBron James'
    team_name   = 'Los Angeles Lakers'

    # look up IDs
    lebron_id = get_player_id(player_name)
    lakers_id = get_team_id(team_name)

    # fetch raw data
    sched_df = fetch_team_schedule(lakers_id, season)
    stats_df = fetch_player_stats(lebron_id, season)

    # parse dates into datetime
    sched_df['DATE_UTC'] = pd.to_datetime(sched_df['GAME_DATE'])
    stats_df ['DATE_UTC'] = pd.to_datetime(stats_df ['GAME_DATE'])

    # merge on the datetime column
    full = sched_df.merge(
        stats_df,
        on='DATE_UTC',
        how='left',
        suffixes=('_SCHED', '_STAT')
    )

    # status flag
    full['Status'] = full['PTS'].notna().map({True: 'Played', False: 'Missed Game'})

    # blank out stats for missed games
    stats_cols = ['PTS','REB','AST','STL','BLK','TOV','FG_PCT','FG3_PCT','FT_PCT']
    full[stats_cols] = full[stats_cols].where(full['Status']=='Played', '')

    # pick & rename columns
    full = full.rename(columns={
        'GAME_DATE_SCHED':'Date',
        'MATCHUP':        'Matchup',
        'WL':             'Result',
        'PTS':            'Points',
        'REB':            'Rebounds',
        'AST':            'Assists',
        'STL':            'Steals',
        'BLK':            'Blocks',
        'TOV':            'Turnovers',
        'FG_PCT':'FG%',
        'FG3_PCT':'3P%',
        'FT_PCT':'FT%'
    })

    out = full.sort_values('DATE_UTC')[[
        'Date','Matchup','Result','Status',
        'Points','Rebounds','Assists',
        'Steals','Blocks','Turnovers',
        'FG%','3P%','FT%'
    ]]

    # display all rows
    pd.set_option('display.max_rows', None)
    print(out.to_string(index=False))

    # if you want a CSV:
    # out.to_csv('lebron_lakers_2024_25_full_log.csv', index=False)

if __name__ == '__main__':
    main()
