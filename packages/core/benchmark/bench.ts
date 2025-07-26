// import { Bench } from 'tinybench'

// import { plus100 } from '../index.js'

// function add(a: number) {
//   return a + 100
// }

// const b = new Bench()

// b.add('Native a + 100', () => {
//   plus100(10)
// })

// b.add('JavaScript a + 100', () => {
//   add(10)
// })

// await b.run()

// console.table(b.table())

import { transform } from '../index.js'

const result = transform(
  /* js */ `
import React from 'react';
import { preview } from 'laaazy';

const App = () => {
  return (
    <div>
      <h1>My Image</h1>
      <img
        src={preview("https://images.unsplash.com/photo-1752588975228-21f44630bb3c?q=80&w=2355&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")}
        alt="A description of the image"
      />
    </div>
  );
};

export default App;
  `,
  `App.tsx`,
)

console.log(result)
