select b.* from `data_property` a, `data_property` b
where a.variableid = b.variableid and 
      a.name='datagrp' and a.value = 'VMAX-TIMEFINDER-SNAPVX-REPLICAS' 