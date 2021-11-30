import './style.css';
import './style1.css';

import(/*webpackChunkName: 'zhengxi' */'./dingzhengxi').then(({default: _}) => {
    console.log(_.name);
})
console.log('hello world');