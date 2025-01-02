import React, { useCallback } from 'react';
import Link from '@mui/material/Link';

export default function LinkOut(props) {
  const handleClick = useCallback(() => {
    console.log(typeof courseterrain.openExternal, props.href);
    courseterrain.openExternal(props.href);
    // if (courseterrain?.openExternal) {
    //   courseterrain.openExternal(props.href);
    // } else {
    //   window.open(props.href);
    // }
  }, [courseterrain.openExternal]);
  return <Link href="#" onClick={handleClick}>{props.children}</Link>
}