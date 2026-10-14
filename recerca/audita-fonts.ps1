# Auditoria de fonts públiques: només desa esquemes i estadístiques agregades.
$ErrorActionPreference = 'Stop'
$base = 'https://dadesobertes.seu-e.cat/api/3/action/'
$checks = @(
 @{name='factures'; id='2e86b79d-b79d-4ae0-9f87-1a56f1c49a4f'; year='EXERCICI'; fields='EXERCICI,DATA_FACTURA,DATA_REGISTRE,IMPORT_FACTURA,CODI_ENS'},
 @{name='proveidors'; id='b8c6a773-1cf2-4592-a9a2-92f30a645985'; year='EXERCICI'; fields='EXERCICI,IMPORT,CODI_ENS'},
 @{name='convenis'; id='a2ca7c35-3afa-41f4-87e6-1d1645d0291a'; fields='CODI_EXPEDIENT,DATA_INICI,DATA_FINAL,ESTAT'},
 @{name='pressupost'; id='595f8620-7a3c-4e38-8be2-7cffa744cd44'; year='ANY_EXERCICI'; filter='CODI_ENS'},
 @{name='liquidacio'; id='5b96829f-d724-4059-a38a-abf514830558'; year='ANY_EXERCICI'; filter='CODI_ENS'},
 @{name='liquidacio_capitols'; id='81f18313-547f-4c87-adbd-c6ce873cb406'; year='ANY_EXERCICI'; filter='CODI_ENS'},
 @{name='efact'; id='4d148e9b-ebed-477a-bfff-22bd3567dcd8'; filter='CODI_ENS_RECEPTOR'; fields='DATA,CODI_ENS_RECEPTOR,REGISTRADA,REGISTRADARCF,COMPTABILITZADA,PAGADA,REBUTJADA'},
 @{name='subvencions'; id='30798421-5952-4420-a769-d1121beb6534'; filter='CODI_ENS'; fields='DATA_DE_CONCESSIO,IMPORT,CODI_ENS'}
)
$captureTime = [datetime]::UtcNow
$report = [ordered]@{ captured_at_utc=$captureTime.ToString('o'); metodologia='Lectura directa paginada; sense noms, NIF personals ni text lliure desats'; ckan=@(); socrata=@() }
foreach($c in $checks){
 $url = $base+'datastore_search?resource_id='+$c.id
 if($c.filter){$f=@{}; $f[$c.filter]='805170005'; $url+='&filters='+[uri]::EscapeDataString(($f|ConvertTo-Json -Compress))}
 if($c.fields){$url+='&fields='+[uri]::EscapeDataString($c.fields)}
 try {
  $rows=[System.Collections.Generic.List[object]]::new(); $offset=0
  do { $r=Invoke-RestMethod -Uri ($url+'&limit=10000&offset='+$offset) -TimeoutSec 45; if(!$r.success){throw 'API success=false'}; $rows.AddRange([object[]]$r.result.records); $offset+=$r.result.records.Count } while($offset -lt $r.result.total -and $r.result.records.Count -gt 0)
  $item=[ordered]@{name=$c.name;url=$url;total=$r.result.total;fetched=$rows.Count;fields=$r.result.fields;years=@();missing=@{};date_ranges=@{}}
  if($c.year){$item.years=@($rows|Group-Object -Property $c.year|Sort-Object Name|Select-Object Name,Count)}
  foreach($field in $r.result.fields.id){ $item.missing[$field]=@($rows|Where-Object {[string]::IsNullOrWhiteSpace([string]$_.$field)}).Count
   if($field -match '^DATA'){ $values=@($rows|ForEach-Object {$_.$field}|Where-Object {$_}|Sort-Object); if($values.Count){$item.date_ranges[$field]=@($values[0],$values[-1])} }
  }
  $report.ckan+= $item
  Write-Output ($c.name+': '+$rows.Count+' files; anys '+(($item.years.Name)-join ','))
 } catch { $report.ckan+=@{name=$c.name;url=$url;error=$_.Exception.Message}; Write-Output ($c.name+': ERROR '+$_.Exception.Message) }
}
foreach($id in @('ybgg-dgi6','8idu-wkjv','hb6v-jcbf')){
 try {
  $meta=Invoke-RestMethod -Uri ('https://analisi.transparenciacatalunya.cat/api/views/'+$id+'.json') -TimeoutSec 45
  $where=if($id -eq 'hb6v-jcbf'){"id_organisme_contractant='0805170005'"}else{"codi_organ='3411306'"}
  $fields=if($id -eq 'ybgg-dgi6'){'id_intern,codi_expedient,numero_lot,procediment,data_adjudicacio_contracte,ofertes_rebudes,import_adjudicacio_sense,codi_ine10,codi_dir3'}elseif($id -eq '8idu-wkjv'){'codi_expedient,numero_lot,tipus_actuacio_execucio,data,import_sense_iva'}else{'codi_expedient,numero_lot,exercici,procediment_adjudicacio,situaci_contractual'}
  $url='https://analisi.transparenciacatalunya.cat/resource/'+$id+'.json?$where='+[uri]::EscapeDataString($where)+'&$select='+$fields+'&$limit=50000'
  $response=Invoke-RestMethod -Uri $url -TimeoutSec 45
  $rows=@($response | ForEach-Object {$_})
  $item=[ordered]@{dataset=$id;url=$url;count=$rows.Count;columns=@($meta.columns|Select-Object fieldName,name,dataTypeName);missing=@{};expedients=@($rows.codi_expedient|Sort-Object -Unique).Count;groups=@();date_range=@()}
  foreach($field in $fields.Split(',')){$item.missing[$field]=@($rows|Where-Object {[string]::IsNullOrWhiteSpace([string]$_.$field)}).Count}
  $group=if($id -eq 'ybgg-dgi6'){'procediment'}elseif($id -eq '8idu-wkjv'){'tipus_actuacio_execucio'}else{'exercici'}
  $item.groups=@($rows|Group-Object -Property $group|Sort-Object Name|Select-Object Name,Count)
  $report.socrata+=$item
  Write-Output ($id+': '+$rows.Count+' files; '+$item.expedients+' expedients diferents')
 }catch{$report.socrata+=@{dataset=$id;error=$_.Exception.Message}; Write-Output $_.Exception.Message}
}
$outputName = 'auditoria-api-'+$captureTime.ToString('yyyyMMdd-HHmmss')+'.json'
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $PSScriptRoot $outputName) -Encoding utf8
Write-Output ('Resultat agregat: '+$outputName)
