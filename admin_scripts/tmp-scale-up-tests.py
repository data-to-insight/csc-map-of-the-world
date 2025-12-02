python admin_scripts/dev-testing-scale_up_yml.py \
  -n 2000 \
  --clean-first --clean-all-orgs --clean-all-rels \
  --make-relationships \
  --id-strategy filestem \
  --rel-mode ring \
  --rel-prefix testrel_ring_

#add light hub clusters
python admin_scripts/dev-testing-scale_up_yml.py \
  -n 1500 \
  --overwrite \
  --make-relationships \
  --id-strategy filestem \
  --rel-mode star \
  --star-span 20 \
  --rel-prefix testrel_star20_

#add few random cross links, capped
python admin_scripts/dev-testing-scale_up_yml.py \
  -n 500 \
  --overwrite \
  --make-relationships \
  --id-strategy filestem \
  --rel-mode random \
  --random-k 1 \
  --seed 42 \
  --max-edges 150 \
  --rel-prefix testrel_rand1_