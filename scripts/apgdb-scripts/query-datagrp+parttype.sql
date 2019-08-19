select distinct a.value as datagrp, b.value as parttype from `data_property` a, `data_property` b
where a.variableid = b.variableid and 
      a.name='datagrp' and
      b.name='parttype'
order by a.value,b.value