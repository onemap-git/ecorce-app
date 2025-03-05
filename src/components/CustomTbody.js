// CustomTbody.js
import React from 'react';

const CustomTbody = React.forwardRef((props, ref) => (
  <tbody ref={ref} {...props} />
));

export default CustomTbody;
