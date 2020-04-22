/** This example is taken from
 * https://github.com/microsoft/Ironclad/blob/master/ironfleet/src/Dafny/Libraries/Math/mul.i.dfy
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the ""Software""), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
*/

lemma lemma_mul_properties()
    ensures forall x:int, y:int  :: x*y == y*x;
    ensures forall x:int :: x*0 == 0*x == 0;
    ensures forall x:int :: x*1 == 1*x == x;
    ensures forall x:int, y:int, z:int  :: x < y && z > 0 ==> x*z < y*z;
    ensures forall x:int, y:int, z:int  :: x <= y && z >= 0 ==> x*z <= y*z;
    ensures forall x:int, y:int, z:int  :: x*(y*z) == (x*y)*z;
    ensures forall x:int, y:int  :: x*y != 0 <==> x != 0 && y != 0;
    ensures forall x:int, y:int  :: 0 <= x && 0 <= y ==> 0 <= x*y;
    ensures forall x:int, y:int  :: 0 < x && 0 < y && 0 <= x*y ==> x <= x*y && y <= x*y;
    ensures forall x:int, y:int  :: (1 < x && 0 < y) ==> (y < x*y);
    ensures forall x:int, y:int  :: (0 < x && 0 < y) ==> (y <= x*y);
    ensures forall x:int, y:int  :: (0 < x && 0 < y) ==> (0 < x*y);
{}