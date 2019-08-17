select * from `data_property` a, `data_property` b
where a.variableid = b.variableid and 
      a.name='name' and a.value like 'TotalMemory' and
      b.name='datagrp'