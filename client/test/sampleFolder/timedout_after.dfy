lemma lemma_mul_basics_forall()
    ensures forall x:int  :: 0*x == 0;
    ensures forall x:int  :: x*0 == 0;
    ensures forall x:int  :: 1*x == x;
    ensures forall x:int  :: x*1 == x;


lemma lemma_mul_ordering_forall()
    ensures forall x:int, y:int  ::
        0 < x && 0 < y && 0 <= x*y
        ==> x <= x*y && y <= x*y;


lemma lemma_mul_strict_inequality_forall()
    ensures  forall x:int, y:int, z:int  ::
        x < y && z>0 ==> x*z < y*z;


lemma lemma_mul_inequality_forall()
    ensures  forall x:int, y:int, z:int  ::
        x <= y && z>=0 ==> x*z <= y*z;

lemma lemma_mul_is_distributive_forall()
    ensures forall x:int, y:int, z:int  :: x*(y + z) == x*y + x*z;
    ensures forall x:int, y:int, z:int  :: x*(y - z) == x*y - x*z;
    ensures forall x:int, y:int, z:int  :: (y + z)*x == y*x + z*x;
    ensures forall x:int, y:int, z:int  :: (y - z)*x == y*x - z*x;


lemma lemma_mul_is_associative_forall()
    ensures forall x:int, y:int, z:int  :: x * (y * z) == (x * y) * z;


lemma lemma_mul_nonnegative_forall()
    ensures forall x:int, y:int  :: 0 <= x && 0 <= y ==> 0 <= x*y;


lemma lemma_mul_strictly_increases_forall()
    ensures forall x:int, y:int  :: (1 < x && 0 < y) ==> (y < x*y);


lemma lemma_mul_increases_forall()
    ensures forall x:int, y:int  :: (0 < x && 0 < y) ==> (y <= x*y);

lemma lemma_mul_strictly_positive_forall()
    ensures forall x:int, y:int  :: (0 < x && 0 < y) ==> (0 < x*y);

lemma lemma_mul_nonzero_forall()
    ensures forall x:int, y:int  :: x*y != 0 <==> x != 0 && y != 0;

//////////////////////////////////////////////////////////////////////////////
//
// The big properties bundle. This can be a little dangerous, because
// it may produce a trigger storm. Whether it does seems to depend on
// how complex the expressions being mul'ed are. If that happens,
// fall back on specifying an individiual _forall lemma or use
// lemma_mul_auto/lemma_mul_auto_induction.
//
//////////////////////////////////////////////////////////////////////////////

lemma lemma_mul_properties()
    ensures forall x:int, y:int  :: x*y == y*x;
    ensures forall x:int  :: x*0 == 0*x == 0;
    ensures forall x:int  :: x*1 == 1*x == x;
    ensures forall x:int, y:int, z:int  :: x < y && z > 0 ==> x*z < y*z;
    ensures forall x:int, y:int, z:int  :: x <= y && z >= 0 ==> x*z <= y*z;
    
    ensures forall x:int, y:int, z:int  :: x*(y*z) == (x*y)*z;
    ensures forall x:int, y:int  :: x*y != 0 <==> x != 0 && y != 0;
    ensures forall x:int, y:int  :: 0 <= x && 0 <= y ==> 0 <= x*y;
    ensures forall x:int, y:int  :: 0 < x && 0 < y && 0 <= x*y ==> x <= x*y && y <= x*y;
    ensures forall x:int, y:int  :: (1 < x && 0 < y) ==> (y < x*y);
    ensures forall x:int, y:int  :: (0 < x && 0 < y) ==> (y <= x*y);
    ensures forall x:int, y:int  :: (0 < x && 0 < y) ==> (0 < x*y);
{
    lemma_mul_basics_forall();
    // assert forall x:int, y:int  :: x*y == y*x;
    // assert forall x:int  :: x*0 == 0*x == 0;
    // assert forall x:int  :: x*1 == 1*x == x;

    lemma_mul_strictly_positive_forall();
    // assert forall x:int, y:int  :: (0 < x && 0 < y) ==> (0 < x*y);

    lemma_mul_strict_inequality_forall();
    // assert forall x:int, y:int, z:int  :: x < y && z > 0 ==> x*z < y*z;

    lemma_mul_inequality_forall();
    // assert forall x:int, y:int, z:int  :: x <= y && z >= 0 ==> x*z <= y*z;

    lemma_mul_is_distributive_forall();
    // assert forall x:int, y:int, z:int  :: x*(y + z) == x*y + x*z;
    // assert forall x:int, y:int, z:int  :: x*(y - z) == x*y - x*z;
    // assert forall x:int, y:int, z:int  :: (y + z)*x == y*x + z*x;
    // assert forall x:int, y:int, z:int  :: (y - z)*x == y*x - z*x;

    lemma_mul_is_associative_forall();
    // assert forall x:int, y:int, z:int  :: x*(y*z) == (x*y)*z;

    lemma_mul_ordering_forall();
    // assert forall x:int, y:int  :: 0 < x && 0 < y && 0 <= x*y ==> x <= x*y && y <= x*y;

    lemma_mul_nonzero_forall();
    // assert forall x:int, y:int  :: x*y != 0 <==> x != 0 && y != 0;

    lemma_mul_nonnegative_forall();
    // assert forall x:int, y:int  :: 0 <= x && 0 <= y ==> 0 <= x*y;

    lemma_mul_strictly_increases_forall();
    // assert forall x:int, y:int  :: (1 < x && 0 < y) ==> (y < x*y);


    lemma_mul_increases_forall();
    // assert forall x:int, y:int  :: (0 < x && 0 < y) ==> (y <= x*y);
}