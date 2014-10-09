# Copyright by Karol Guciek (http://guciek.github.io)
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, version 2 or 3.

ls pages | while read p; do
    H=$(find pages/$p -type f -name '*.html')
    if [ "x$H" = x ]; then
        continue
    fi
    cat $H | \
        sed -e 's/src="/\n|||/g' | \
        grep '^|||' | \
        cut -d '|' -f 4 | \
        cut -d '"' -f 1 | \
        sort | \
        uniq | \
        while read src; do
            F=${src##*/}
            if [ ! -f "pages/$p/$F" -o "$src" != "/file/$p/$F" ]; then
                echo "Page '$p': image '$src' is missing"
            fi
        done
done
